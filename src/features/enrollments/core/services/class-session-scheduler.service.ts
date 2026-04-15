import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { Clock, ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Data } from "../data";
import { Errors } from "../errors";

export namespace ClassSessionScheduler {
  export async function create() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    return new Service({ classOfferingRepo, classSessionRepo });
  }

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

    async recordMissingSessions(args: {
      dateRange: { startDate?: Date | undefined; endDate: Date };
      tx?: TxContext | undefined;
    }) {
      const { dateRange, tx } = args;

      let finalStartDate;

      try {
        finalStartDate = await this.resolveStartDate({
          startDate: dateRange.startDate,
          tx,
        });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_SYSTEM_ERROR",
            message:
              "Failed to resolve start date for recording missign sessions",
            err,
          }),
        );
      }

      return await this.recordAllInRange({
        dateRange: {
          startDate: finalStartDate,
          endDate: dateRange.endDate,
        },
      });
    }

    async recordAllInRange(args: {
      dateRange: {
        startDate: Date;
        endDate: Date;
      };
      tx?: TxContext | undefined;
    }) {
      const { tx } = args;
      let { startDate, endDate } = args.dateRange;

      /**
       * * normalize date to get true range (starting hour of start date
       * * and last possible ms of end date)
       */
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      const timeRange = {
        startTime: startDate.getTime(),
        endTime: endDate.getTime(),
      };

      const txPromise = execTransaction(async (tx) => {
        const generated: Generated = {
          attempted: [],
          inserted: [],
          skipped: 0,
        };

        while (timeRange.startTime <= timeRange.endTime) {
          const current = new Date(timeRange.startTime);

          const sessions = await this.generateSessionsForDate({
            date: current,
            tx,
          });

          if (sessions.length) {
            generated.attempted.push(...sessions);

            let dayInsertedCount = 0;
            const chunkSize = 30;

            //    record sessions for each
            for (let i = 0; i < sessions.length; i += chunkSize) {
              const inserted = await this.insertSessions({
                values: { sessions: sessions.slice(i, i + chunkSize) },
                tx,
              });

              generated.inserted.push(...inserted);
              dayInsertedCount += inserted.length;
            }

            generated.skipped += sessions.length - dayInsertedCount;
          }

          current.setDate(current.getDate() + 1);
          timeRange.startTime = current.getTime();
        }

        return generated;
      }, tx);

      try {
        this.ensureValidDateRange({ startDate, endDate });
        const generated = await txPromise;

        return ResultBuilder.success({ generated });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed storing class sessions.",
            err,
          }),
        );
      }
    }

    async recordAllToday(args?: { tx?: TxContext | undefined }) {
      return await this.recordAllForDay({ ...args, date: Clock.now() });
    }

    async recordAllForDay(args: { date: Date; tx?: TxContext | undefined }) {
      const txPromise = execTransaction(async (tx) => {
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
          const inserted = await this.insertSessions({
            values: { sessions: sessions.slice(i, i + chunkSize) },
            tx,
          });

          dayInsertedCount += inserted.length;

          generated.inserted.push(...inserted);
        }

        generated.skipped = sessions.length - dayInsertedCount;

        return generated;
      }, args.tx);

      try {
        this.ensureValidDateRange({ startDate: args.date, endDate: args.date });
        const generated = await txPromise;

        return ResultBuilder.success({ generated });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed storing class sessions.",
            err,
          }),
        );
      }
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

    private async insertSessions(args: {
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

    private async resolveStartDate(args: {
      startDate?: Date | undefined;
      tx?: TxContext | undefined;
    }) {
      const startTimeMs =
        args.startDate?.getTime() ??
        //  * database fallback in case no provided input
        (await this._classSessionRepo
          .getLatest({ dbOrTx: args.tx })
          .then((r) => r?.startTimeMs)) ??
        //  * env config fallback incase no stored sessions (time is always 00:00:00)
        Data.Env.getAcademicYearConfig().semesterStart.getTime();

      return new Date(startTimeMs);
    }

    private ensureValidDateRange(args: { startDate: Date; endDate: Date }) {
      this.ensureValidStartDate(args.startDate);
      this.ensureValidEndDate(args.endDate);
    }

    private ensureValidStartDate(date: Date) {
      const dateMs = date.getTime();
      const semStartDateMs =
        Data.Env.getAcademicYearConfig().semesterStart.getTime();

      if (semStartDateMs > dateMs)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_SYSTEM_ERROR",
          message: `Date: ${date.toISOString()} is not a valid date for scheduling sessions.`,
        });
    }

    private ensureValidEndDate(date: Date) {
      const dateMs = date.getTime();
      const semEndDateMs =
        Data.Env.getAcademicYearConfig().semesterEnd.getTime();

      if (semEndDateMs < dateMs)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_SYSTEM_ERROR",
          message: `Date: ${date.toISOString()} is not a valid date for scheduling sessions.`,
        });
    }
  }
}
