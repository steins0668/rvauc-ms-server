import { execTransaction, TxContext } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { Clock, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types } from "../../types";

export namespace ClassSessionRecorder {
  type Generated = {
    attempted: Types.InsertModels.ClassSession[];
    inserted: Types.ViewModels.ClassSession[];
    skipped: number;
  };

  export class Service {
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _classSessionRepo: Repositories.ClassSession;

    constructor(args: {
      classOfferingRepo: Repositories.ClassOffering;
      classSessionRepo: Repositories.ClassSession;
    }) {
      this._classOfferingRepo = args.classOfferingRepo;
      this._classSessionRepo = args.classSessionRepo;
    }

    async ensureSessionsForDate(args: {
      date: Date;
      tx?: TxContext | undefined;
    }) {
      return await execTransaction(async (tx) => {
        const sessions = await this.generateSessionsForDate({
          date: args.date,
          tx,
        });

        const generated: Generated = {
          attempted: sessions,
          inserted: [],
          skipped: sessions.length,
        };

        if (!sessions.length) return generated;

        let dayInsertedCount = 0;
        const chunkSize = 30;

        //    record sessions for each
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
      date: Date;
      tx?: TxContext | undefined;
    }) {
      const { date, tx } = args;

      const sessions: Types.InsertModels.ClassSession[] = [];

      const weekDay = TimeUtil.toPhDay(date);
      const datePh = TimeUtil.toPhDate(date);
      const nowISO = Clock.now().toISOString();
      //    get all offerings in current day
      const offerings = await this.getOfferings({
        values: { weekDay },
        tx,
      });

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

    private async getOfferings(args: {
      values: { weekDay: string };
      tx?: TxContext | undefined;
    }) {
      const { values, tx } = args;

      try {
        return await this._classOfferingRepo.execQuery({
          dbOrTx: tx,
          fn: async (query) =>
            query.findMany({
              where: (co, { eq }) => eq(co.weekDay, values.weekDay),
              columns: {
                id: true,
                classId: true,
                startTime: true,
                endTime: true,
              },
            }),
        });
      } catch (err) {
        throw DbAccess.normalizeError({
          name: "DB_ACCESS_QUERY_ERROR",
          message: "Failed querying class_offerings table.",
          err,
        });
      }
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
        throw DbAccess.normalizeError({
          name: "DB_ACCESS_INSERT_ERROR",
          message: "Failed inserting into class_sessions table.",
          err,
        });
      }
    }
  }
}
