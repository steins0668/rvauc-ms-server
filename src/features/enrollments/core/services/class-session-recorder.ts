import { execTransaction, TxContext } from "../../../../db/create-context";
import { Clock, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Errors } from "../errors";
import { ClassOfferingQuery } from "./class-offering-query.service";

export namespace ClassSessionRecorder {
  type Generated = {
    attempted: Types.InsertModels.ClassSession[];
    inserted: Types.ViewModels.ClassSession[];
    skipped: number;
  };

  export class Service {
    private readonly _classSessionRepo: Repositories.ClassSession;
    private readonly _classOfferingQuery: ClassOfferingQuery.Service;

    constructor(args: {
      classSessionRepo: Repositories.ClassSession;
      classOfferingQuery: ClassOfferingQuery.Service;
    }) {
      this._classSessionRepo = args.classSessionRepo;
      this._classOfferingQuery = args.classOfferingQuery;
    }

    async ensureSessionsForDate(args: {
      values: { date: Date; termId: number };
      tx?: TxContext | undefined;
    }) {
      const { values } = args;

      return await execTransaction(async (tx) => {
        const offerings =
          await this._classOfferingQuery.getMinimalShapesForWeekday({
            values: {
              weekDay: TimeUtil.toPhDay(values.date),
              termId: values.termId,
            },
            tx,
          });

        const sessions = await this.generateSessionsForDate({
          values: {
            date: values.date,
            offerings,
          },
        });

        const generated: Generated = {
          attempted: sessions,
          inserted: [],
          skipped: sessions.length,
        };

        if (!sessions.length) return generated;

        let dayInsertedCount = 0;
        const chunkSize = 30;

        //  chunk the insert
        for (let i = 0; i < sessions.length; i += chunkSize) {
          const inserted = await this.insert({
            values: { sessions: sessions.slice(i, i + chunkSize) },
            tx,
          });

          dayInsertedCount += inserted.length;

          generated.inserted.push(...inserted);
        }

        generated.skipped = sessions.length - dayInsertedCount;

        return generated;
      }, args.tx);
    }

    private async generateSessionsForDate(args: {
      values: {
        offerings: Awaited<
          ReturnType<ClassOfferingQuery.Service["getMinimalShapesForWeekday"]>
        >;
        date: Date;
      };
    }) {
      const { date, offerings } = args.values;

      const sessions: Types.InsertModels.ClassSession[] = [];

      const datePh = TimeUtil.toPhDate(date);
      const nowISO = Clock.now().toISOString();

      for (const o of offerings) {
        const { startTimeMs, endTimeMs } = TimeUtil.getPhTimeRange(
          date,
          o.startTime,
          o.endTime,
        );

        sessions.push({
          classId: o.classId,
          classOfferingId: o.id,
          datePh,
          startTimeMs,
          endTimeMs,
          createdAt: nowISO,
          updatedAt: nowISO,
        });
      }

      return sessions;
    }

    private async insert(args: {
      values: { sessions: Types.InsertModels.ClassSession[] };
      tx?: TxContext | undefined;
    }) {
      const { values, tx } = args;

      try {
        return await this._classSessionRepo.execInsert({
          dbOrTx: tx,
          fn: async ({ insert }) =>
            await insert
              .values(values.sessions)
              .onConflictDoNothing()
              .returning(),
        });
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed inserting into class_sessions table.",
          err,
        });
      }
    }
  }
}
