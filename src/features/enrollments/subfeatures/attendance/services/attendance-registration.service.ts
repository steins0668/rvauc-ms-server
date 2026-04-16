import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import {
  Clock,
  RepositoryUtil,
  ResultBuilder,
  TimeUtil,
} from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { Types } from "../types";
import { Utils } from "../utils";

export namespace AttendanceRegistration {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    const classRuntimeResolver = new Core.Services.ClassRuntimeResolver.Service(
      {
        classRepo,
        classOfferingRepo,
        classSessionRepo,
        enrollmentRepo,
      },
    );
    return new Service({ attendanceRecordRepo, classRuntimeResolver });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;

    public constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

    public async mutateRecords(args: {
      values: {
        classId: number;
        classOfferingId: number;
        date: Date;
        professorId?: number | undefined;
        records: {
          recordedDate: Date;
          studentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      const uniqueRecords = new Map<number, (typeof values.records)[number]>();

      for (const r of values.records) uniqueRecords.set(r.studentId, r);

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
        existingStudentIds: Set<number>,
        session: { datePh: string; startTimeMs: number; endTimeMs: number },
      ) => {
        let updates: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
        let inserts: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
        let rejects: Schemas.Dto.ClassAttendance.NormalizedRecords = [];

        for (const r of values.records) {
          const normalized = normalizeRecord(r);

          const exists = existingStudentIds.has(normalized.studentId);

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

      const txPromise = this._attendanceRecordRepo.execTransaction(
        async (tx) => {
          const session =
            await this._classRuntimeResolver.ensureScheduledSession({
              values: {
                date: values.date,
                classOfferingId: values.classOfferingId,
              },
              mode: "now",
              tx,
            });

          const studentIds = values.records.map((r) => r.studentId);

          const existingStudentIds = await this.getExistingRecords({
            values: {
              classId: values.classId,
              classOfferingId: values.classOfferingId,
              datePh: session.datePh,
              studentIds,
            },
            dbOrTx: tx,
          });

          const organizedRecords = organizeRecords(existingStudentIds, session);

          const updated = organizedRecords.updates.length
            ? await this.updateRecords({
                dbOrTx: tx,
                values: {
                  classId: values.classId,
                  classOfferingId: values.classOfferingId,
                  updatedAt: createdOrUpdatedAt,
                  updatedByUserId: values.professorId,
                  records: organizedRecords.updates,
                },
              })
            : [];

          const inserted = organizedRecords.inserts.length
            ? await this.insertRecords({
                dbOrTx: tx,
                onConflict: "doNothing",
                values: organizedRecords.inserts.map((r) => {
                  return {
                    classId: values.classId,
                    classOfferingId: values.classOfferingId,
                    studentId: r.studentId,
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
        },
        dbOrTx,
      );

      try {
        const result = await txPromise;

        return ResultBuilder.success(
          this.toAttendanceRecordMutationResultDto(
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

    public async newRecord(args: {
      dbOrTx?: DbOrTx | undefined;
      onConflict?: "doNothing" | "doUpdate" | undefined;
      value: Types.InsertModels.AttendanceRecord;
    }) {
      const stored = await this.newRecords({
        ...args,
        values: [args.value],
      });

      return stored.success
        ? ResultBuilder.success(stored.result[0])
        : ResultBuilder.fail(stored.error);
    }

    public async newRecords(args: {
      dbOrTx?: DbOrTx | undefined;
      onConflict?: "doNothing" | "doUpdate" | undefined;
      values: Types.InsertModels.AttendanceRecord[];
    }) {
      let inserted;

      try {
        inserted = await this.insertRecords(args);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_STORE_ERROR",
            message: `Failed storing ${args.values.length} new attendance records`,
            err,
          }),
        );
      }

      try {
        const dtoList = inserted.map((raw) => this.toNewRecordDto(raw));
        return ResultBuilder.success(dtoList);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          }),
        );
      }
    }

    private toNewRecordDto(
      raw: NonNullable<Awaited<ReturnType<typeof this.insertRecords>>[number]>,
    ) {
      const dto = {
        id: raw.id,
        status: raw.status,
        date: raw.datePh,
        time: TimeUtil.toPhTime(new Date(raw.recordedAt)),
        isNew: raw.recordCount === 1,
      };

      return Schemas.Dto.insertedAttendance.parse(dto);
    }

    private toAttendanceRecordMutationResultDto(
      updated: Awaited<ReturnType<typeof this.updateRecords>>,
      inserted: Awaited<ReturnType<typeof this.insertRecords>>,
      rejected: Schemas.Dto.ClassAttendance.NormalizedRecords,
    ): Schemas.Dto.ClassAttendance.MutationResult {
      const updatedDto = updated.map((r) => {
        return {
          id: r.id,
          status: r.status,
          date: r.datePh,
          time: TimeUtil.toPhTime(new Date(r.recordedAt)),
          isNew: r.recordCount === 1,
        };
      });

      const insertedDto = inserted.map((r) => {
        return {
          id: r.id,
          status: r.status,
          date: r.datePh,
          time: TimeUtil.toPhTime(new Date(r.recordedAt)),
          isNew: r.recordCount === 1,
        };
      });

      return { updated: updatedDto, inserted: insertedDto, rejected };
    }

    private async insertRecords(args: {
      dbOrTx?: DbOrTx | undefined;
      onConflict?: "doNothing" | "doUpdate" | undefined;
      values: Types.InsertModels.AttendanceRecord[];
    }) {
      const { dbOrTx, onConflict = "doNothing", values } = args;
      return await this._attendanceRecordRepo.execInsert({
        dbOrTx,
        fn: async ({ table: ar, insert, sql }) => {
          let insertion = insert.values(values);

          const targets = [
            sql`student_id`,
            sql`class_id`,
            sql`class_offering_id`,
            sql`date_ph`,
          ];

          insertion =
            onConflict === "doNothing"
              ? insertion.onConflictDoNothing({ target: targets })
              : insertion.onConflictDoUpdate({
                  target: [
                    ar.studentId,
                    ar.classId,
                    ar.classOfferingId,
                    ar.datePh,
                  ],
                  set: { recordCount: sql`${ar.recordCount} + 1` }, //  ! increase record count on conflict
                });

          return insertion.returning();
        },
      });
    }

    private async getExistingRecords(args: {
      values: {
        classId: number;
        classOfferingId: number;
        datePh: string;
        studentIds: number[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      return await this._attendanceRecordRepo
        .execQuery({
          dbOrTx,
          fn: async (query) =>
            query.findMany({
              where: (ar, { and, eq, inArray }) =>
                and(
                  inArray(ar.studentId, values.studentIds),
                  eq(ar.classId, values.classId),
                  eq(ar.classOfferingId, values.classOfferingId),
                  eq(ar.datePh, values.datePh),
                ),
              columns: { studentId: true },
            }),
        })
        .then((r) => new Set(r.map((r) => r.studentId)));
    }

    private async updateRecords(args: {
      values: {
        classId: number;
        classOfferingId: number;
        updatedByUserId?: number | undefined;
        updatedAt: string;
        records: {
          datePh: string;
          recordedAt: string;
          recordedMs: number;
          studentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values } = args;
      const { attendanceRecords: ar } = Schema;
      const { and, eq } = RepositoryUtil.filters;

      const updated = [];

      for (const r of args.values.records) {
        const res = await this._attendanceRecordRepo.execUpdate({
          dbOrTx: args.dbOrTx,
          fn: async (update) =>
            update
              .set({
                recordedAt: r.recordedAt,
                recordedMs: r.recordedMs,
                status: r.status,
                updatedAt: values.updatedAt,
                updatedByUserId: values.updatedByUserId,
              })
              .where(
                and(
                  eq(ar.studentId, r.studentId),
                  eq(ar.classId, values.classId),
                  eq(ar.classOfferingId, values.classOfferingId),
                  eq(ar.datePh, r.datePh),
                ),
              )
              .returning(),
        });

        if (res.length === 0)
          throw new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_UPDATE_ERROR",
            message: `Attendance record with class_id: ${values.classId}, class_offering_id: ${values.classOfferingId}, and student_id: ${r.studentId} for date: ${r.datePh} not found.`,
          });

        updated.push(...res);
      }

      return updated;
    }
  }
}
