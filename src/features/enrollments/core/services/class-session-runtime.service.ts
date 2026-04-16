import { SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../db/create-context";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Schemas } from "../schemas";
import { Errors } from "../errors";
import { ClassSession } from "./class-session.service";
import { Enums } from "../../../../data";

export namespace ClassSessionRuntime {
  const { roles } = Auth.Core.Data.Records;
  export async function create() {
    const context = await createContext();
    const classRepo = new Repositories.Class(context);
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    const enrollmentRepo = new Repositories.Enrollment(context);
    const classSessionService = new ClassSession.Service({
      classOfferingRepo,
      classSessionRepo,
    });
    return new Service({
      classRepo,
      classOfferingRepo,
      classSessionRepo,
      enrollmentRepo,
      classSessionService,
    });
  }

  export class Service {
    private readonly _classRepo: Repositories.Class;
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _classSessionRepo: Repositories.ClassSession;
    private readonly _enrollmentRepo: Repositories.Enrollment;
    private readonly _classSessionService: ClassSession.Service;

    constructor(args: {
      classRepo: Repositories.Class;
      classOfferingRepo: Repositories.ClassOffering;
      classSessionRepo: Repositories.ClassSession;
      enrollmentRepo: Repositories.Enrollment;
      classSessionService: ClassSession.Service;
    }) {
      this._classRepo = args.classRepo;
      this._classOfferingRepo = args.classOfferingRepo;
      this._classSessionRepo = args.classSessionRepo;
      this._enrollmentRepo = args.enrollmentRepo;
      this._classSessionService = args.classSessionService;
    }

    async getForNow(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      tx?: TxContext | undefined;
    }) {
      const { date } = args.values;

      let offering;
      let session;

      const txPromise = execTransaction(async (tx) => {
        const offering = await this.queryOffering({ ...args, mode: "now" });
        const session = await this.ensureSession({
          ...args,
          values: { date, offering },
          mode: "now",
        });

        return { offering, session };
      });

      try {
        const result = await txPromise;

        offering = result.offering;
        session = result.session;
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed resolving class offering and/or session.",
            err,
          }),
        );
      }

      if (!session)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_SYSTEM_ERROR",
            message: `Failed ensuring existence of class session for ${JSON.stringify(offering)}`,
          }),
        );

      try {
        const parsed = this.toDto(offering, session);

        return ResultBuilder.success({ ...parsed });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollment DTO",
            err,
          }),
        );
      }
    }

    async getForNowOrNext(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      tx?: TxContext | undefined;
    }) {
      const { date } = args.values;

      let offering;
      let session;

      const txPromise = execTransaction(async (tx) => {
        const offering = await this.queryOffering({
          ...args,
          mode: "now-or-next",
        });
        const session = await this.ensureSession({
          ...args,
          values: { date, offering },
          mode: "now-or-next",
        });

        return { offering, session };
      });

      try {
        const result = await txPromise;

        offering = result.offering;
        session = result.session;
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed resolving class offering and/or session.",
            err,
          }),
        );
      }

      if (!session)
        return new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_SYSTEM_ERROR",
          message: `Failed ensuring existence of class session for ${JSON.stringify(offering)}`,
        });

      try {
        const parsed = this.toDto(offering, session);

        return ResultBuilder.success({ ...parsed });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollment DTO",
            err,
          }),
        );
      }
    }

    private async queryOffering(
      args: Parameters<typeof this.whereClassOffering>[0],
    ) {
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

    private async ensureSession(args: {
      values: {
        date: Date;
        offering: NonNullable<
          Awaited<
            ReturnType<Repositories.ClassOffering["queryWithClassAndProfessor"]>
          >[number]
        >;
      };
      mode: "now" | "now-or-next";
      tx?: TxContext | undefined;
    }) {
      const { date, offering } = args.values;
      let session;

      try {
        session = await this.getSession({
          values: { date, classOfferingId: offering.id },
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

      return (co, { and, eq, or, lte, gt, exists }) => {
        const day = Enums.Days[date.getDay()] as string;
        const weekDay = day.substring(0, 3);

        const conditions: (SQLWrapper | undefined)[] = [
          eq(co.weekDay, weekDay),
          exists(subqueryC(co.classId)),
        ];

        if (role === "student") conditions.push(exists(subqueryE(co.id))); //  ! professors don't need enrollments subquery

        if (mode === "now") {
          const seconds = TimeUtil.secondsSinceMidnightPh(date);

          //  ! for allowing attendance 30 minutes before class
          const offsetDate = new Date(date);
          offsetDate.setMinutes(offsetDate.getMinutes() + 30);
          const offsetSeconds = TimeUtil.secondsSinceMidnightPh(offsetDate);

          conditions.push(
            or(
              //  ! class currently in session
              and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
              //  ! class starts in 30 minutes
              and(gt(co.startTime, seconds), lte(co.startTime, offsetSeconds)),
            ),
          );
        }

        if (mode === "now-or-next") {
          const seconds = TimeUtil.secondsSinceMidnightPh(date);

          conditions.push(
            or(
              //  ! class currently in sesion
              and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
              //  ! next class
              gt(co.startTime, seconds),
            ),
          );
        }

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

    private toDto(
      co: NonNullable<
        Awaited<
          ReturnType<Repositories.ClassOffering["queryWithClassAndProfessor"]>
        >[0]
      >,
      cs: NonNullable<
        Awaited<ReturnType<Repositories.ClassSession["queryMinimalShape"]>>[0]
      >,
    ): {
      class: Schemas.Dto.Class_ & {
        course: Schemas.Dto.Course;
        offering: Schemas.Dto.ClassOffering;
        professor: Schemas.Dto.Professor;
        session: Schemas.Dto.ClassSession;
      };
    } {
      const { class: cls, rooms: r } = co;
      const { course: crs, professor: p } = co.class;

      return {
        class: {
          id: cls.id,
          classNumber: cls.classNumber,
          course: crs,
          offering: {
            id: co.id,
            weekDay: co.weekDay,
            room: r?.name ?? "N/A",
            startTimeText: co.startTimeText,
            endTimeText: co.endTimeText,
            startTime: co.startTime,
            endTime: co.endTime,
          },
          professor: {
            surname: p.user.surname,
            firstName: p.user.firstName,
            middleName: p.user.middleName,
            gender: p.user.gender,
            college: p.college.name,
            facultyRank: p.facultyRank,
          },
          session: Schemas.Dto.classSession.parse({
            id: cs.id,
            status: cs.status,
            datePh: cs.datePh,
            startTimeMs: cs.startTimeMs,
            endTimeMs: cs.endTimeMs,
          }),
        },
      };
    }
  }
}
