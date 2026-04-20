import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../../db/create-context";
import { Clock, ResultBuilder } from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { Utils } from "../utils";
import { AttendanceCommand } from "./attendance-command.service";
import { AttendanceMutationDto } from "./attendance-mutation-dto.mapper";

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
    private readonly _classSessionQueryService: Core.Services.ClassSessionQuery.Service;
    private readonly _enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
    private readonly _classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;

    public constructor(args: {
      attendanceCommand: AttendanceCommand.Service;
      classSessionQuery: Core.Services.ClassSessionQuery.Service;
      enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
      classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;
    }) {
      this._attendanceCommand = args.attendanceCommand;
      this._classSessionQueryService = args.classSessionQuery;
      this._enrollmentQueryService = args.enrollmentQueryService;
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

    //  todo: clean up flow
    async mutateClassSessionRecords(args: {
      values: {
        classSessionId: number;
        professorId?: number | undefined;
        records: Schemas.RequestBody.RecordSubmission;
      };
      tx?: TxContext | undefined;
    }) {
      const { values, tx } = args;

      //  * remove duplicate records
      const uniqueRecords = new Map<number, (typeof values.records)[number]>();

      for (const r of values.records) uniqueRecords.set(r.enrollmentId, r);

      values.records = Array.from(uniqueRecords.values());

      const txPromise = execTransaction(async (tx) => {
        //  * ensure session is valid
        const session = await this._classSessionQueryService.ensureMinimalShape(
          {
            where: (cs, { eq }) => eq(cs.id, values.classSessionId),
            dbOrTx: args.tx,
          },
        );

        //  * organize records
        const organizedRecords =
          Utils.Policy.AttendanceSumbission.organizeRecords(
            values.records,
            session,
          );

        //  * auditing field
        const createdOrUpdatedAt = Clock.now().toISOString();

        //  * execute upsert
        const upserted = organizedRecords.upserts.length
          ? await this._attendanceCommand.upsertStatusAndRecordDateTime({
              tx,
              values: {
                classId: session.classId,
                classSessionId: session.id,
                datePh: session.datePh,
                createdAt: createdOrUpdatedAt,
                updatedAt: createdOrUpdatedAt,
                updatedByUserId: values.professorId,
                records: organizedRecords.upserts,
              },
            })
          : [];

        const inserted = upserted.filter((r) => r.createdAt === r.updatedAt);
        const updated = upserted.filter((r) => r.createdAt !== r.updatedAt);

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

    //  todo: clean up flow
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

        const status = Utils.Policy.Attendance.getAttendanceStatus({
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
