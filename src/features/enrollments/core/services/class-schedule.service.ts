import { SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Enums } from "../../../../data";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

export namespace ClassSchedule {
  const { roles } = Auth.Core.Data.Records;

  export async function createService() {
    const context = await createContext();
    const classRepo = new Repositories.Class(context);
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const enrollmentRepo = new Repositories.Enrollment(context);

    return new Service({ classRepo, classOfferingRepo, enrollmentRepo });
  }

  export class Service {
    private readonly _classRepo: Repositories.Class;
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _enrollmentRepo: Repositories.Enrollment;

    public constructor(args: {
      classRepo: Repositories.Class;
      classOfferingRepo: Repositories.ClassOffering;
      enrollmentRepo: Repositories.Enrollment;
    }) {
      this._classRepo = args.classRepo;
      this._classOfferingRepo = args.classOfferingRepo;
      this._enrollmentRepo = args.enrollmentRepo;
    }

    public async getForNow(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      userId: number;
      role: keyof typeof roles;
    }) {
      let result;
      try {
        result = await this._classOfferingRepo
          .queryWithClassAndProfessor({
            where: this.whereClassOffering({ ...args, mode: "now" }),
            orderBy: (co, { asc }) => asc(co.startTime),
            constraints: { limit: 1 },
            dbOrTx: args.dbOrTx,
          })
          .then((result) => result[0]);
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          }),
        );
      }

      if (!result)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
            message: `This ${args.role} has neither an ongoing class or a class that starts in 30 minutes.`,
          }),
        );

      try {
        const parsed = this.toDto(result);
        return ResultBuilder.success({ ...parsed, sessionDate: args.date });
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

    public async getForNowOrNext(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      userId: number;
      role: keyof typeof roles;
    }) {
      let result;
      try {
        result = await this._classOfferingRepo
          .queryWithClassAndProfessor({
            where: this.whereClassOffering({ ...args, mode: "now-or-next" }),
            orderBy: (co, { asc }) => asc(co.startTime),
            constraints: { limit: 1 },
            dbOrTx: args.dbOrTx,
          })
          .then((result) => result[0]);
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          }),
        );
      }

      if (!result)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR",
            message: `This ${args.role} does not have any more classes for today.`,
          }),
        );

      try {
        const parsed = this.toDto(result);
        return ResultBuilder.success(parsed);
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

    public async getForToday(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      userId: number;
      role: keyof typeof roles;
    }) {
      let result;
      try {
        result = await this._classOfferingRepo.queryWithClassAndProfessor({
          where: this.whereClassOffering({ ...args, mode: "today" }),
          orderBy: (co, { asc }) => asc(co.startTime),
          constraints: { limit: 50 },
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          }),
        );
      }

      if (result.length === 0)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR",
            message: `This ${args.role} has no classes for today.`,
          }),
        );

      try {
        const parsed = result.map((row) => this.toDto(row));
        return ResultBuilder.success(parsed);
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

    public async getForTerm(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      userId: number;
      role: keyof typeof roles;
    }) {
      let result;
      try {
        result = await this._classOfferingRepo.queryWithClassAndProfessor({
          where: this.whereClassOffering({ ...args, mode: "term" }),
          orderBy: (co, { asc }) => asc(co.startTime),
          constraints: { limit: 50 },
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          }),
        );
      }

      if (result.length === 0)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_CLASS_LIST_ERROR",
            message: `This ${args.role} has no classes for this term.`,
          }),
        );

      try {
        const distinctClasses = Array.from(
          new Map(result.map((row) => [row.class.classNumber, row])).values(),
        );

        const parsed = distinctClasses.map((row) => this.toDto(row));
        return ResultBuilder.success(parsed);
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

    /**
     * ! when using this method, select queries MUST be ordered ascending by startTime. otherwise the time filtering gets messed up.
     * @param args
     * @returns
     */
    private whereClassOffering(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      userId: number;
      role: keyof typeof roles;
      mode: "term" | "today" | "now" | "now-or-next";
    }): Types.Repository.WhereBuilders.ClassOffering {
      const { dbOrTx, date, userId, termId, role, mode } = args;

      const allowedRoles = [roles.professor, roles.student] as const;

      if (!allowedRoles.includes(role))
        throw new Auth.Core.Errors.Authentication.ErrorClass({
          name: "AUTHENTICATION_FORBIDDEN_ROLE_ERROR",
          message: `Unsupported role for schedule query: ${role}.`,
        });

      const subqueryC = (classId: SQLiteColumn) =>
        this._classRepo.existsForContext({
          dbOrTx,
          classId,
          termId,
          professorId: role === "professor" ? userId : undefined,
        });
      const subqueryE = (classOfferingId: SQLiteColumn) =>
        this._enrollmentRepo.existsForStudentAndOffering({
          dbOrTx,
          classOfferingId,
          studentId: userId,
        });

      return (co, { eq, and, or, lte, gt, exists }) => {
        const conditions: (SQLWrapper | undefined)[] = [];

        conditions.push(exists(subqueryC(co.classId)));

        if (role === "student") conditions.push(exists(subqueryE(co.id))); //  ! professors don't need enrollments subquery

        if (mode !== "term") {
          const day = Enums.Days[date.getDay()] as string;
          const weekDay = day.substring(0, 3);
          conditions.push(eq(co.weekDay, weekDay));
        }

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

    private toDto(
      classOffering: NonNullable<
        Awaited<
          ReturnType<Repositories.ClassOffering["queryWithClassAndProfessor"]>
        >[0]
      >,
    ): {
      class: Schemas.Dto.Class_ & {
        course: Schemas.Dto.Course;
        offering: Schemas.Dto.ClassOffering;
        professor: Schemas.Dto.Professor;
      };
    } {
      const { class: class_, rooms } = classOffering;
      const { course, professor } = classOffering.class;

      const dto = {
        class: {
          id: class_.id,
          classNumber: class_.classNumber,
          course,
          offering: {
            id: classOffering.id,
            weekDay: classOffering.weekDay,
            room: rooms?.name ?? "N/A",
            startTimeText: classOffering.startTimeText,
            endTimeText: classOffering.endTimeText,
            startTime: classOffering.startTime,
            endTime: classOffering.endTime,
          },
          professor: {
            surname: professor.user.surname,
            firstName: professor.user.firstName,
            middleName: professor.user.middleName,
            gender: professor.user.gender,
            college: professor.college.name,
            facultyRank: professor.facultyRank,
          },
        },
      };

      return dto;
    }
  }
}
