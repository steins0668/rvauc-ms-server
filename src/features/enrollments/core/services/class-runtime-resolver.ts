import { SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { TimeUtil } from "../../../../utils";
import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../db/create-context";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Errors } from "../errors";
import { Enums } from "../../../../data";
import { Data } from "../data";

export namespace ClassRuntimeResolver {
  const { roles } = Auth.Core.Data.Records;
  export async function create() {
    const context = await createContext();
    const classRepo = new Repositories.Class(context);
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    const enrollmentRepo = new Repositories.Enrollment(context);

    return new Service({
      classRepo,
      classOfferingRepo,
      classSessionRepo,
      enrollmentRepo,
    });
  }

  export class Service {
    private readonly _classRepo: Repositories.Class;
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _classSessionRepo: Repositories.ClassSession;
    private readonly _enrollmentRepo: Repositories.Enrollment;

    constructor(args: {
      classRepo: Repositories.Class;
      classOfferingRepo: Repositories.ClassOffering;
      classSessionRepo: Repositories.ClassSession;
      enrollmentRepo: Repositories.Enrollment;
    }) {
      this._classRepo = args.classRepo;
      this._classOfferingRepo = args.classOfferingRepo;
      this._classSessionRepo = args.classSessionRepo;
      this._enrollmentRepo = args.enrollmentRepo;
    }

    /**
     * ! do not touch. query composition is done with reusability in mind.
     * @param args
     * @returns
     */
    async resolve(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      mode: "now" | "now-or-next";
      sessionPolicy?: "strict-scheduled" | "default";
      tx?: TxContext | undefined;
    }) {
      const { date, termId, userId } = args.values;

      const txPromise = execTransaction(async (tx) => {
        const offering = await this.ensureOffering({
          values: { date, termId, userId },
          role: args.role,
          mode: args.mode,
          tx,
        });
        const session =
          args.sessionPolicy === "strict-scheduled"
            ? await this.ensureScheduledSession({
                values: { date, classOfferingId: offering.id },
                mode: args.mode,
                tx,
              })
            : await this.ensureSession({
                values: { date, classOfferingId: offering.id },
                mode: args.mode,
                tx,
              });

        return { offering, session };
      }, args.tx);

      try {
        return await txPromise;
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
          message: "Failed resolving class offering and/or session runtime.",
          err,
        });
      }
    }

    async ensureOffering(args: Parameters<typeof this.whereClassOffering>[0]) {
      let offering;

      try {
        offering = await this._classOfferingRepo
          .queryWithClassAndProfessor({
            where: this.whereClassOffering(args),
            orderBy: (co, { asc }) => asc(co.startTime),
            constraints: { limit: 1 },
            dbOrTx: args.tx,
          })
          .then((r) => r[0]);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `enrollments` table.",
          err,
        });
      }

      if (!offering)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
          message:
            args.mode === "now"
              ? `This ${args.role} has neither an ongoing class or a class that starts in 30 minutes.`
              : `This ${args.role} does not have any more classes for today.`,
        });

      return offering;
    }

    async ensureScheduledSession(args: {
      values: {
        date: Date;
        classOfferingId: number;
      };
      mode: "now" | "now-or-next";
      tx?: TxContext | undefined;
    }) {
      const session = await this.ensureSession(args);

      if (session.status === Data.classSessionStatus.cancelled)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
          message: "This class session was cancelled.",
        });

      return session;
    }

    async ensureSession(args: {
      values: {
        date: Date;
        classOfferingId: number;
      };
      mode: "now" | "now-or-next";
      tx?: TxContext | undefined;
    }) {
      const { date, classOfferingId } = args.values;
      let session;

      try {
        session = await this.getSession({
          values: { date, classOfferingId },
          mode: args.mode,
          tx: args.tx,
        });
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_sessions` table.",
          err,
        });
      }

      if (!session)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR",
          message: "Session not found for expected class schedule.",
        });

      return session;
    }

    private async getSession(args: {
      values: { classOfferingId: number; date: Date };
      mode: "now" | "now-or-next";
      tx?: TxContext | undefined;
    }) {
      return await this._classSessionRepo
        .queryMinimalShape({
          where: this.whereClassSession({
            values: args.values,
            mode: args.mode,
          }),
          dbOrTx: args.tx,
        })
        .then((r) => r[0]);
    }

    /**
     * ! when using this method, select queries MUST be ordered ascending by startTime. otherwise the time filtering gets messed up.
     * @param args
     * @returns
     */
    private whereClassOffering(args: {
      values: { date: Date; termId: number; userId: number };
      role: keyof typeof roles;
      mode: "now" | "now-or-next";
      tx?: TxContext | undefined;
    }): Types.Repository.WhereBuilders.ClassOffering {
      const { tx, role, mode } = args;
      const { date, userId, termId } = args.values;

      const allowedRoles = [roles.professor, roles.student] as const;

      if (!allowedRoles.includes(role))
        throw new Auth.Core.Errors.Authentication.ErrorClass({
          name: "AUTHENTICATION_FORBIDDEN_ROLE_ERROR",
          message: `Unsupported role for schedule query: ${role}.`,
        });

      const subqueryC = (classId: SQLiteColumn) =>
        this._classRepo.existsForContext({
          dbOrTx: tx,
          classId,
          termId,
          professorId: role === "professor" ? userId : undefined,
        });
      const subqueryE = (classOfferingId: SQLiteColumn) =>
        this._enrollmentRepo.existsForStudentAndOffering({
          dbOrTx: tx,
          classOfferingId,
          studentId: userId,
        });

      return (co, { and, eq, exists }) => {
        const day = Enums.Days[date.getDay()] as string;
        const weekDay = day.substring(0, 3);

        const conditions: (SQLWrapper | undefined)[] = [
          eq(co.weekDay, weekDay),
          exists(subqueryC(co.classId)),
        ];

        if (role === "student") conditions.push(exists(subqueryE(co.id))); //  ! professors don't need enrollments subquery

        const timeFilters = this._classOfferingRepo.getTimeFilters({
          date,
          mode,
        });

        conditions.push(timeFilters);

        return conditions.length ? and(...conditions) : undefined;
      };
    }

    private whereClassSession(args: {
      values: { classOfferingId: number; date: Date };
      mode: "now" | "now-or-next";
    }): Types.Repository.WhereBuilders.ClassSession {
      const { mode } = args;
      const { classOfferingId, date } = args.values;
      const ms = date.getTime();

      return (cs, { and, or, eq, lte, gt }) => {
        const conditions: (SQLWrapper | undefined)[] = [
          eq(cs.classOfferingId, classOfferingId),
        ];

        if (mode === "now") {
          //  ! for allowing attendance 30 minutes before class
          const offsetDate = new Date(date);
          offsetDate.setMinutes(offsetDate.getMinutes() + 30);
          const offsetMs = offsetDate.getTime();

          conditions.push(
            or(
              //  ! class currently in session
              and(lte(cs.startTimeMs, ms), gt(cs.endTimeMs, ms)),
              //  ! class starts in 30 minutes
              and(gt(cs.startTimeMs, ms), lte(cs.startTimeMs, offsetMs)),
            ),
          );
        }

        if (mode === "now-or-next") {
          conditions.push(
            or(
              //  ! class currently in sesion
              and(lte(cs.startTimeMs, ms), gt(cs.endTimeMs, ms)),
              //  ! next class
              gt(cs.startTimeMs, ms),
            ),
          );
        }

        return conditions.length ? and(...conditions) : undefined;
      };
    }
  }
}
