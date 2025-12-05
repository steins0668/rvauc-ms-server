import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { Schema } from "../../../../models";
import { ResultBuilder } from "../../../../utils";
import { Repositories } from "./repositories";
import { Types } from "./types";

export namespace Services {
  export namespace AttendanceData {
    export async function createService() {
      const context = await createContext();
      const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
      return new Service(attendanceRecordRepo);
    }

    export class Service {
      private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
      public constructor(attendanceRecordRepo: Repositories.AttendanceRecord) {
        this._attendanceRecordRepo = attendanceRecordRepo;
      }

      public async storeAttendanceRecord(args: {
        dbOrTx?: DbOrTx | undefined;
        onConflict?: "doNothing" | "doUpdate" | undefined;
        value: Types.InsertModels.AttendanceRecord;
      }) {
        const stored = await this.storeAttendanceRecords({
          ...args,
          values: [args.value],
        });

        return stored.success
          ? ResultBuilder.success(stored.result[0])
          : ResultBuilder.fail(stored.error);
      }

      public async storeAttendanceRecords(args: {
        dbOrTx?: DbOrTx | undefined;
        onConflict?: "doNothing" | "doUpdate" | undefined;
        values: Types.InsertModels.AttendanceRecord[];
      }) {
        const { dbOrTx, onConflict = "doNothing", values } = args;
        return await this.insertAttendance({
          dbOrTx,
          fn: async ({ insert, sql }) => {
            let insertion = insert.values(values);

            insertion =
              onConflict === "doNothing"
                ? insertion.onConflictDoNothing()
                : insertion.onConflictDoUpdate({
                    target: Schema.attendanceRecords.id,
                    set: {
                      status: sql`excluded.status`,
                      recordedAt: sql`excluded.recorded_at`,
                      recordedMs: sql`excluded.recorded_ms`,
                      datePh: sql`excluded.date_ph`,
                    },
                  });

            return await insertion.returning();
          },
        });
      }

      public async insertAttendance<T>(
        args: Types.Repository.InsertArgs.AttendanceRecord<T>
      ) {
        try {
          const inserted = await this._attendanceRecordRepo.execInsert(args);
          return ResultBuilder.success(inserted);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_INSERT_ERROR",
              message: "Failed inserting into `attendance_records` table.",
              err,
            })
          );
        }
      }

      public async queryAttendance<T>(
        args: Types.Repository.QueryArgs.AttendanceRecord<T>
      ) {
        try {
          const queried = await this._attendanceRecordRepo.execQuery(args);
          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed querying `attendance_records` table.",
              err,
            })
          );
        }
      }

      public async updateAttendance<T>(
        args: Types.Repository.UpdateArgs.AttendanceRecord<T>
      ) {
        try {
          const updated = await this._attendanceRecordRepo.execUpdate(args);
          return ResultBuilder.success(updated);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_UPDATE_ERROR",
              message: "Failed updating `attendance_records` table.",
              err,
            })
          );
        }
      }
    }
  }
}
