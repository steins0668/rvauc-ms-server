import { TxContext } from "../../../../../db/create-context";
import { Clock, TimeUtil } from "../../../../../utils";
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

    async upsertStatusAndRecordDateTime(args: {
      values: {
        classId: number;
        classSessionId: number;
        datePh: string;
        createdAt: string;
        updatedAt: string;
        updatedByUserId?: number | undefined;
        records: {
          recordedAt: string;
          recordedMs: number;
          enrollmentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      tx?: TxContext | undefined;
    }) {
      const { tx, values } = args;

      const upserts: Types.InsertModels.AttendanceRecord[] = values.records.map(
        (r) => {
          return {
            enrollmentId: r.enrollmentId,
            classId: values.classId,
            classSessionId: values.classSessionId,
            status: r.status,
            datePh: values.datePh,
            createdAt: values.createdAt,
            recordedAt: r.recordedAt,
            recordedMs: r.recordedMs,
            updatedAt: values.updatedAt,
            updatedByUserId: values.updatedByUserId,
          };
        },
      );

      const insert = this._attendanceRecordRepo.execInsert({
        dbOrTx: tx,
        fn: async ({ table: ar, insert, sql }) => {
          return insert
            .values(upserts)
            .onConflictDoUpdate({
              target: [ar.enrollmentId, ar.classSessionId, ar.datePh],
              set: {
                status: sql`excluded.status`,
                recordedAt: sql`excluded.recorded_at`,
                recordedMs: sql`excluded.recorded_ms`,
                updatedAt: sql`excluded.updated_at`,
                updatedByUserId: sql`excluded.updated_by_user_id`,
              },
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
  }
}
