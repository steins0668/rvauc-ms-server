import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../db/create-context";
import { Clock, ResultBuilder } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Data } from "../data";
import { Errors } from "../errors";
import { ClassOfferingQuery } from "./class-offering-query.service";
import { ClassSessionQuery } from "./class-session-query.service";
import { ClassSessionRecorder } from "./class-session-recorder";
import { TermResolver } from "./term-resolver.service";

export namespace ClassSessionScheduler {
  export async function create() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    const termRepo = new Repositories.Term(context);
    return new Service({
      classSessionQuery: new ClassSessionQuery.Service({ classSessionRepo }),
      classSessionRecorder: new ClassSessionRecorder.Service({
        classSessionRepo,
        classOfferingQuery: new ClassOfferingQuery.Service({
          classOfferingRepo,
        }),
      }),
      termResolver: new TermResolver.Service(termRepo),
    });
  }

  type Generated = {
    attempted: Types.InsertModels.ClassSession[];
    inserted: Types.ViewModels.ClassSession[];
    skipped: number;
  };

  export class Service {
    private readonly _classSessionQuery: ClassSessionQuery.Service;
    private readonly _classSessionRecorder: ClassSessionRecorder.Service;
    private readonly _termResolver: TermResolver.Service;

    constructor(args: {
      classSessionQuery: ClassSessionQuery.Service;
      classSessionRecorder: ClassSessionRecorder.Service;
      termResolver: TermResolver.Service;
    }) {
      this._classSessionQuery = args.classSessionQuery;
      this._classSessionRecorder = args.classSessionRecorder;
      this._termResolver = args.termResolver;
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
        const term = await this._termResolver.resolveCurrentTerm({ tx });

        const total: Generated = {
          attempted: [],
          inserted: [],
          skipped: 0,
        };

        while (timeRange.startTime <= timeRange.endTime) {
          const current = new Date(timeRange.startTime);

          const generated =
            await this._classSessionRecorder.ensureSessionsForDate({
              values: { date: current, termId: term.id },
              tx,
            });

          total.attempted.push(...generated.attempted);
          total.inserted.push(...generated.inserted);
          total.skipped += generated.skipped;

          current.setDate(current.getDate() + 1);
          timeRange.startTime = current.getTime();
        }

        return total;
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
      try {
        this.ensureValidDateRange({ startDate: args.date, endDate: args.date });
        const term = await this._termResolver.resolveCurrentTerm(args);
        const generated =
          await this._classSessionRecorder.ensureSessionsForDate({
            values: { date: args.date, termId: term.id },
            tx: args.tx,
          });

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

    private async resolveStartDate(args: {
      startDate?: Date | undefined;
      tx?: TxContext | undefined;
    }) {
      const startTimeMs =
        args.startDate?.getTime() ??
        //  * database fallback in case no provided input
        (await this._classSessionQuery
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
