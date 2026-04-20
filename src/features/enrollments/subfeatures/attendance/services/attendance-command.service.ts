import { execTransaction, TxContext } from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import { Clock, RepositoryUtil, TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Types } from "../types";

export namespace AttendanceCommand {
  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;

    constructor(args: { attendanceRecordRepo: Repositories.AttendanceRecord }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
    }

    async persistSessionAttendance(args: {
      values: {
        classId: number;
        classSessionId: number;
        enrollmentId: number;
        status: string;
        recordedDate: Date;
      };
      tx?: TxContext | undefined;
    }) {
      const { values, tx } = args;

      const nowIso = Clock.now().toISOString();
      const recordedDateIso = values.recordedDate.toISOString();
      const recordedDateMs = values.recordedDate.getTime();

      const inserted = await this.upsertRecordCount({
        tx,
        values: {
          enrollmentId: values.enrollmentId,
          classId: values.classId,
          classSessionId: values.classSessionId,
          status: values.status,
          createdAt: nowIso,
          recordedAt: recordedDateIso,
          recordedMs: recordedDateMs,
          updatedAt: nowIso,
          datePh: TimeUtil.toPhDate(values.recordedDate),
        },
      }).then((r) => r[0]);

      if (inserted === undefined)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed storing attendance record.",
        });

      return inserted;
    }

    async upsertRecordCount(args: {
      tx?: TxContext | undefined;
      values: Types.InsertModels.AttendanceRecord;
    }) {
      const { tx: dbOrTx, values } = args;
      const insert = this._attendanceRecordRepo.execInsert({
        dbOrTx,
        fn: async ({ table: ar, insert, sql }) => {
          return insert
            .values(values)
            .onConflictDoUpdate({
              target: [ar.enrollmentId, ar.classSessionId, ar.datePh],
              set: { recordCount: sql`${ar.recordCount} + 1` }, //  ! increase record count on conflict
            })
            .returning();
        },
      });

      try {
        return await insert;
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed upserting into `attendance_records` table.",
          err,
        });
      }
    }

    async persistRecords(args: {
      tx?: TxContext | undefined;
      onConflict?: "doNothing" | "doUpdate" | undefined;
      values: Types.InsertModels.AttendanceRecord[];
    }) {
      const { tx: dbOrTx, onConflict = "doNothing", values } = args;
      const insert = this._attendanceRecordRepo.execInsert({
        dbOrTx,
        fn: async ({ table: ar, insert, sql }) => {
          let insertion = insert.values(values);

          const targets = [
            sql`enrollment_id`,
            sql`class_session_id`,
            sql`date_ph`,
          ];

          insertion =
            onConflict === "doNothing"
              ? insertion.onConflictDoNothing({ target: targets })
              : insertion.onConflictDoUpdate({
                  target: [ar.enrollmentId, ar.classSessionId, ar.datePh],
                  set: { recordCount: sql`${ar.recordCount} + 1` }, //  ! increase record count on conflict
                });

          return insertion.returning();
        },
      });

      try {
        return await insert;
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed inserting into `attendance_records` table.",
          err,
        });
      }
    }

    async updateClassSessionRecords(args: {
      values: {
        classSessionId: number;
        datePh: string;
        updatedByUserId?: number | undefined;
        updatedAt: string;
        records: {
          recordedAt: string;
          recordedMs: number;
          enrollmentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      tx?: TxContext | undefined;
    }) {
      const { values } = args;
      const { attendanceRecords: ar } = Schema;
      const { and, eq } = RepositoryUtil.filters;

      return await execTransaction(async (tx) => {
        const updated = [];

        for (const r of args.values.records) {
          const res = await this._attendanceRecordRepo.execUpdate({
            dbOrTx: tx,
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
                    eq(ar.enrollmentId, r.enrollmentId),
                    eq(ar.classSessionId, values.classSessionId),
                    eq(ar.datePh, values.datePh),
                  ),
                )
                .returning(),
          });

          if (res.length === 0)
            throw new Core.Errors.EnrollmentData.ErrorClass({
              name: "ENROLLMENT_DATA_UPDATE_ERROR",
              message: `Attendance record with for session, student in date: ${values.datePh} not found.`,
            });

          updated.push(...res);
        }

        return updated;
      }, args.tx);
    }
  }
}
