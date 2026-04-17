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
import { Types } from "../types";

export namespace AttendanceAbsenceAutomation {
  export async function create() {
    const context = await createContext();

    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    return new Service({ attendanceRecordRepo, classSessionRepo });
  }

  type Generated = {
    attempted: Types.InsertModels.AttendanceRecord[];
    inserted: Types.ViewModels.AttendanceRecord[];
    skipped: number;
  };

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classSessionRepo: CoreRepositories.ClassSession;

    constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classSessionRepo: CoreRepositories.ClassSession;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classSessionRepo = args.classSessionRepo;
    }

    async markMissingForDate(args: { date: Date; tx?: TxContext | undefined }) {
      const txPromise = execTransaction(async (tx) => {
        const datePh = TimeUtil.toPhDate(args.date);
        const status = Core.Data.classSessionStatus.scheduled;
        const now = Clock.now();
        const nowIso = now.toISOString();

        const records: Types.InsertModels.AttendanceRecord[] = [];

        //  get sessions for today
        const sessions = await this.getSessionsWithEnrollmentsForDate({
          datePh,
          status,
          tx,
        });

        //  * generate records
        //  todo: abstract this
        for (const s of sessions) {
          const { classOffering: co } = s;
          const { enrollments } = co;

          const recordedDate = new Date(s.endTimeMs);
          const recordedAt = recordedDate.toISOString();
          const recordedMs = recordedDate.getTime();

          enrollments.forEach((e) =>
            records.push({
              studentId: e.studentId,
              classId: co.classId,
              classOfferingId: co.id,
              classSessionId: s.id,
              status: Data.attendanceStatus.absent,
              createdAt: nowIso,
              recordedAt,
              recordedMs,
              updatedAt: nowIso,
              datePh,
            }),
          );
        }

        const generated: Generated = {
          attempted: records,
          inserted: [],
          skipped: 0,
        };

        if (!records.length) return generated;

        //  persist records
        const chunkSize = 30;
        for (let i = 0; i < records.length; i += chunkSize) {
          const inserted = await this.insertRecords({
            values: records.slice(i, i + chunkSize),
            onConflict: "doNothing",
            tx,
          });

          generated.inserted.push(...inserted);
        }

        generated.skipped = records.length - generated.inserted.length;

        return generated;
      }, args.tx);

      try {
        const generated = await txPromise;

        return ResultBuilder.success({ generated });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed marking missing records as absent",
            err,
          }),
        );
      }
    }

    private async getSessionsWithEnrollmentsForDate(args: {
      datePh: string;
      status: string;
      tx?: TxContext | undefined;
    }) {
      try {
        return await this._classSessionRepo.getWithEnrollments({
          where: (cs, { eq, and }) =>
            and(eq(cs.datePh, args.datePh), eq(cs.status, args.status)),
          orderBy: (cs, { asc }) => asc(cs.startTimeMs),
          dbOrTx: args.tx,
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: `Failed retrieving sessions for date: ${args.datePh}`,
          err,
        });
      }
    }

    private async insertRecords(args: {
      tx?: TxContext | undefined;
      onConflict?: "doNothing" | "doUpdate" | undefined;
      values: Types.InsertModels.AttendanceRecord[];
    }) {
      const { tx, onConflict = "doNothing", values } = args;
      const insert = this._attendanceRecordRepo.execInsert({
        dbOrTx: tx,
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

      try {
        return await insert;
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed storing attendance records.",
          err,
        });
      }
    }
  }
}
