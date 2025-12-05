import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Core } from "../../core";
import { Repositories } from "./repositories";
import { Schemas } from "./schemas";
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
        let inserted;

        try {
          inserted = await this.insertRecords(args);
        } catch (err) {
          return ResultBuilder.fail(
            Core.Errors.EnrollmentData.normalizeError({
              name: "ENROLLMENT_DATA_STORE_ERROR",
              message: `Failed storing ${args.values.length} new attendance records`,
              err,
            })
          );
        }

        try {
          const dtoList = inserted.map((raw) => this.toAttendanceDto(raw));
          return ResultBuilder.success(dtoList);
        } catch (err) {
          return ResultBuilder.fail(
            Core.Errors.EnrollmentData.normalizeError({
              name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
              message: "Failed converting raw attendance to dto",
              err,
            })
          );
        }
      }

      private toAttendanceDto(
        raw: NonNullable<Awaited<ReturnType<typeof this.insertRecord>>>
      ) {
        const dto = {
          id: raw.id,
          status: raw.status,
          date: raw.datePh,
          time: TimeUtil.toPhTime(new Date(raw.recordedAt)),
        };

        return Schemas.Dto.attendance.parse(dto);
      }

      private async insertRecord(args: {
        dbOrTx?: DbOrTx | undefined;
        onConflict?: "doNothing" | "doUpdate" | undefined;
        value: Types.InsertModels.AttendanceRecord;
      }) {
        return await this.insertRecords({
          dbOrTx: args.dbOrTx,
          onConflict: args.onConflict,
          values: [args.value],
        }).then((result) => result[0]);
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

            insertion =
              onConflict === "doNothing"
                ? insertion.onConflictDoNothing()
                : insertion.onConflictDoUpdate({
                    target: [ar.studentId, ar.enrollmentId, ar.datePh],
                    set: { status: sql`excluded.status` },
                  });

            return insertion.returning();
          },
        });
      }
    }
  }
}
