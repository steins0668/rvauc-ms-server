import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../../db/create-context";
import { Clock, ResultBuilder, TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { Utils } from "../utils";
import { AttendanceCommand } from "./attendance-command.service";
import { AttendanceMutationDto } from "./attendance-mutation-dto.mapper";
import { AttendanceQuery } from "./attendance-query.service";

export namespace AttendanceRegistration {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    return new Service({
      attendanceCommand: new AttendanceCommand.Service({
        attendanceRecordRepo,
      }),
      attendanceQueryService: new AttendanceQuery.Service({
        attendanceRecordRepo,
      }),
      classSessionQuery: new Core.Services.ClassSessionQuery.Service({
        classSessionRepo,
      }),
      enrollmentQueryService: new Core.Services.EnrollmentQuery.Service({
        enrollmentRepo,
      }),
      classRuntimeResolver: new Core.Services.ClassRuntimeResolver.Service({
        classRepo,
        classOfferingRepo,
        classSessionRepo,
        enrollmentRepo,
      }),
    });
  }

  export class Service {
    private readonly _attendanceCommand: AttendanceCommand.Service;
    private readonly _attendanceQueryService: AttendanceQuery.Service;
    private readonly _classSessionQueryService: Core.Services.ClassSessionQuery.Service;
    private readonly _enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
    private readonly _classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;

    public constructor(args: {
      attendanceCommand: AttendanceCommand.Service;
      attendanceQueryService: AttendanceQuery.Service;
      classSessionQuery: Core.Services.ClassSessionQuery.Service;
      enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
      classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;
    }) {
      this._attendanceCommand = args.attendanceCommand;
      this._attendanceQueryService = args.attendanceQueryService;
      this._classSessionQueryService = args.classSessionQuery;
      this._enrollmentQueryService = args.enrollmentQueryService;
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

    async mutateRecords(args: {
      values: {
        classSessionId: number;
        date: Date;
        professorId?: number | undefined;
        records: {
          recordedDate: Date;
          enrollmentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      tx?: TxContext | undefined;
    }) {
      const { values, tx } = args;
      const datePh = TimeUtil.toPhDate(values.date);

      const uniqueRecords = new Map<number, (typeof values.records)[number]>();

      for (const r of values.records) uniqueRecords.set(r.enrollmentId, r);

      values.records = Array.from(uniqueRecords.values());

      const normalizeRecord = (r: (typeof values.records)[number]) => {
        //  todo: automate setting recordedAt to end of class time when status = absent
        return {
          ...r,
          recordedAt: r.recordedDate.toISOString(),
          recordedMs: r.recordedDate.getTime(),
          datePh: TimeUtil.toPhDate(r.recordedDate),
        };
      };

      const organizeRecords = (
        existingEnrollmentIds: Set<number>,
        session: { datePh: string; startTimeMs: number; endTimeMs: number },
      ) => {
        let updates: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
        let inserts: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
        let rejects: Schemas.Dto.ClassAttendance.NormalizedRecords = [];

        for (const r of values.records) {
          const normalized = normalizeRecord(r);

          const exists = existingEnrollmentIds.has(normalized.enrollmentId);

          const isSameDate = normalized.datePh === session.datePh;

          if (
            !isSameDate ||
            !Utils.AttendancePolicy.isWithinSchedule(
              normalized.recordedDate,
              session,
            )
          ) {
            rejects.push(normalized);
            continue;
          }

          exists ? updates.push(normalized) : inserts.push(normalized);
        }

        return { updates, inserts, rejects };
      };

      const createdOrUpdatedAt = Clock.now().toISOString();

      const txPromise = execTransaction(async (tx) => {
        const session = await this._classSessionQueryService.ensureMinimalShape(
          {
            where: (cs, { eq }) => eq(cs.id, values.classSessionId),
            dbOrTx: args.tx,
          },
        );

        const enrollmentIds = values.records.map((r) => r.enrollmentId);

        const existingRecords =
          await this._attendanceQueryService.fetchMinimalRecordsForSessionEnrollments(
            {
              values: {
                classSessionId: session.id,
                enrollmentIds,
              },
              dbOrTx: tx,
            },
          );

        const organizedRecords = organizeRecords(
          new Set(existingRecords.map((r) => r.enrollmentId)),
          session,
        );

        const updated = organizedRecords.updates.length
          ? await this._attendanceCommand.updateClassSessionRecords({
              tx,
              values: {
                classSessionId: session.id,
                datePh,
                updatedAt: createdOrUpdatedAt,
                updatedByUserId: values.professorId,
                records: organizedRecords.updates,
              },
            })
          : [];

        const inserted = organizedRecords.inserts.length
          ? await this._attendanceCommand.persistRecords({
              tx,
              onConflict: "doNothing",
              values: organizedRecords.inserts.map((r) => {
                return {
                  classId: session.classId,
                  classSessionId: session.id,
                  enrollmentId: r.enrollmentId,
                  status: r.status,
                  createdAt: createdOrUpdatedAt,
                  recordedAt: r.recordedAt,
                  recordedMs: r.recordedMs,
                  updatedAt: createdOrUpdatedAt,
                  updatedByUserId: values.professorId ?? null,
                  datePh: r.datePh,
                };
              }),
            })
          : [];

        return { updated, inserted, rejected: organizedRecords.rejects };
      }, tx);

      try {
        const result = await txPromise;

        return ResultBuilder.success(
          AttendanceMutationDto.Mapper.toAttendanceRecordMutationResultDto(
            result.updated,
            result.inserted,
            result.rejected,
          ),
        );
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message:
              "Failed to update and/or insert in attendance_records table.",
            err,
          }),
        );
      }
    }

    async recordSessionAttendance(args: {
      values: {
        termId: number;
        studentId: number;
        recordedDate: Date;
      };
      tx?: TxContext | undefined;
    }) {
      const { termId, studentId, recordedDate } = args.values;
      const txPromise = execTransaction(async (tx) => {
        const clsRuntime = await this._classRuntimeResolver.resolve({
          values: { termId, userId: studentId, date: recordedDate },
          role: "student",
          mode: "now",
          sessionPolicy: "strict-scheduled",
          tx,
        });

        const enrollment =
          await this._enrollmentQueryService.ensureEnrollmentForClassAndStudent(
            {
              values: { studentId, classId: clsRuntime.offering.class.id },
              dbOrTx: tx,
            },
          );

        const status = Utils.AttendancePolicy.getAttendanceStatus({
          attendanceDate: recordedDate,
          schedStartTime: clsRuntime.offering.startTime,
          schedEndTime: clsRuntime.offering.endTime,
        });

        const inserted = await this._attendanceCommand.persistSessionAttendance(
          {
            values: {
              classId: clsRuntime.offering.class.id,
              classSessionId: clsRuntime.session.id,
              status,
              enrollmentId: enrollment.id,
              recordedDate,
            },
            tx,
          },
        );

        return { clsRuntime, inserted };
      }, args.tx);

      let txResult;

      try {
        txResult = await txPromise;
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed storing attendance record from scan.",
            err,
          }),
        );
      }

      try {
        const dto = AttendanceMutationDto.Mapper.toSessionAttendanceResultDto(
          txResult.clsRuntime,
          txResult.inserted,
        );

        return ResultBuilder.success(dto);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message:
              "Failed to convert scan attendance registration result to dto",
            err,
          }),
        );
      }
    }
  }
}
