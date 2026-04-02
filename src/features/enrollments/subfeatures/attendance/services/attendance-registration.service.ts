import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { Types } from "../types";

export namespace AttendanceRegistration {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    return new Service(attendanceRecordRepo);
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    public constructor(attendanceRecordRepo: Repositories.AttendanceRecord) {
      this._attendanceRecordRepo = attendanceRecordRepo;
    }

    public async updateOrNewRecords(args: {
      values: {
        classId: number;
        classOfferingId: number;
        date: Date;
        records: {
          studentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      let recordsToUpdate = [];
      let recordsToInsert = [];

      const datePh = TimeUtil.toPhDate(values.date);

      const txPromise = this._attendanceRecordRepo.execTransaction(
        async (tx) => {
          const studentIds = values.records.map((r) => r.studentId);

          const existingStudentIds = await this.getExistingRecords({
            values: {
              classId: values.classId,
              classOfferingId: values.classOfferingId,
              datePh,
              studentIds,
            },
            dbOrTx,
          });

          recordsToUpdate = values.records.filter((r) =>
            existingStudentIds.has(r.studentId),
          );

          recordsToInsert = values.records.filter(
            (r) => !existingStudentIds.has(r.studentId),
          );

          const updated = await this.updateRecords({
            dbOrTx: tx,
            values: {
              classId: values.classId,
              classOfferingId: values.classOfferingId,
              datePh,
              records: recordsToUpdate,
            },
          });

          const inserted = await this.insertRecords({
            dbOrTx: tx,
            onConflict: "doNothing",
            values: recordsToInsert.map((r) => {
              return {
                classId: values.classId,
                classOfferingId: values.classOfferingId,
                studentId: r.studentId,
                status: r.status,
                recordedAt: values.date.toISOString(),
                recordedMs: values.date.getTime(),
                datePh,
              };
            }),
          });

          return { updated, inserted };
        },
        dbOrTx,
      );

      try {
        const result = await txPromise;

        return ResultBuilder.success(
          this.toUpdateOrNewRecordDto(result.updated, result.inserted),
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

      return Schemas.Dto.registeredAttendance.parse(dto);
    }

    private toUpdateOrNewRecordDto(
      updated: Awaited<ReturnType<typeof this.updateRecords>>,
      inserted: Awaited<ReturnType<typeof this.insertRecords>>,
    ) {
      return [...updated, ...inserted].map((r) => {
        return {
          id: r.id,
          status: r.status,
          date: r.datePh,
          time: TimeUtil.toPhTime(new Date(r.recordedAt)),
          isNew: r.recordCount === 1,
        };
      });
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
        datePh: string;
        records: {
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
              .set({ status: r.status })
              .where(
                and(
                  eq(ar.studentId, r.studentId),
                  eq(ar.classId, values.classId),
                  eq(ar.classOfferingId, values.classOfferingId),
                  eq(ar.datePh, values.datePh),
                ),
              )
              .returning(),
        });

        if (res.length === 0)
          throw new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_UPDATE_ERROR",
            message: `Attendance record with class_id: ${values.classId}, class_offering_id: ${values.classOfferingId}, and student_id: ${r.studentId} for date: ${values.datePh} not found.`,
          });

        updated.push(...res);
      }

      return updated;
    }
  }
}
