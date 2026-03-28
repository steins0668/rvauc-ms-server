import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Enums } from "../../../../data";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Types } from "../../types";
import { SQLWrapper } from "drizzle-orm";
import { Auth } from "../../../auth";

export namespace ClassSchedule {
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
      role: keyof typeof Auth.Core.Data.Records.roles;
    }) {
      let result;
      try {
        result = await this.queryOne({
          dbOrTx: args.dbOrTx,
          where: this.whereClassOffering({ ...args, mode: "now" }),
          orderBy: (co, { asc }) => asc(co.startTime),
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

      if (!result)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
            message: `This ${args.role} has neither an ongoing class or a class that starts in 30 minutes.`,
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
      role: keyof typeof Auth.Core.Data.Records.roles;
    }) {
      let result;
      try {
        result = await this.queryMany({
          dbOrTx: args.dbOrTx,
          where: this.whereClassOffering({ ...args, mode: "today" }),
          orderBy: this.orderByStartTimeAscending(),
          constraints: { limit: 50 },
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
      role: keyof typeof Auth.Core.Data.Records.roles;
    }) {
      let result;
      try {
        result = await this.queryMany({
          dbOrTx: args.dbOrTx,
          where: this.whereClassOffering({ ...args, mode: "term" }),
          orderBy: this.orderByStartTimeAscending(),
          constraints: { limit: 50 },
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

    private whereClassOffering(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      userId: number;
      role: keyof typeof Auth.Core.Data.Records.roles;
      mode: "term" | "today" | "now";
    }): Types.Repository.WhereBuilders.ClassOffering {
      const { dbOrTx, date, userId, termId, role, mode } = args;

      const subqueryC = (classId: SQLiteColumn) =>
        this.classSubquery({
          dbOrTx,
          classId,
          termId,
          professorId: role === "professor" ? userId : undefined,
        });
      const subqueryE = (classOfferingId: SQLiteColumn) =>
        this.enrollmentSubquery({ dbOrTx, classOfferingId, studentId: userId });

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

        return conditions.length ? and(...conditions) : undefined;
      };
    }

    private orderByStartTimeAscending(): Types.Repository.OrderBuilders.ClassOffering {
      return (co, { asc }) => asc(co.startTime);
    }

    private classSubquery(args: {
      dbOrTx?: DbOrTx | undefined;
      classId: SQLiteColumn;
      termId: number;
      professorId?: number | undefined;
    }) {
      const { dbOrTx, classId, termId, professorId } = args;
      return this._classRepo.getContext({
        dbOrTx,
        fn: ({ table: c, context }) => {
          const { eq, and } = RepositoryUtil.filters;

          const conditions = [eq(c.id, classId), eq(c.termId, termId)];
          //  ! used when querying class offerings for professors
          if (professorId !== undefined)
            conditions.push(eq(c.professorId, professorId));

          return context
            .select({ id: c.id })
            .from(c)
            .where(and(...conditions));
        },
      });
    }

    private enrollmentSubquery(args: {
      dbOrTx?: DbOrTx | undefined;
      classOfferingId: SQLiteColumn;
      studentId: number;
    }) {
      const { dbOrTx, classOfferingId, studentId } = args;
      return this._enrollmentRepo.getContext({
        dbOrTx,
        fn: ({ table: e, context, converter }) =>
          context
            .select({ id: e.id })
            .from(e)
            .where(
              converter({
                custom: (e, { eq, and }) => [
                  and(
                    eq(e.classOfferingId, classOfferingId),
                    eq(e.studentId, studentId),
                  ),
                ],
              }),
            ),
      });
    }

    private toDto(
      classOffering: NonNullable<Awaited<ReturnType<typeof this.queryOne>>>,
    ) {
      const { course, professor } = classOffering.class;

      const dto = {
        //  * class metadata
        id: classOffering.id,
        classId: classOffering.class.id,
        weekDay: classOffering.weekDay,
        room: classOffering.rooms?.name,
        startTimeText: classOffering.startTimeText,
        endTimeText: classOffering.endTimeText,
        startTime: classOffering.startTime,
        endTime: classOffering.endTime,
        classNumber: classOffering.class.classNumber,
        //  * course metadata
        courseCode: course.code,
        courseName: course.name,
        //  * professor metadata
        professor: professor.user,
      };

      return Schemas.Dto.scheduledClass.parse(dto);
    }

    private async queryOne(args: {
      dbOrTx?: DbOrTx | undefined;
      where?: Types.Repository.WhereBuilders.ClassOffering;
      orderBy?: Types.Repository.OrderBuilders.ClassOffering;
    }) {
      const { dbOrTx, where, orderBy } = args;
      return await this.queryMany({
        dbOrTx,
        where,
        orderBy,
        constraints: { limit: 1 },
      }).then((result) => result[0]);
    }

    private async queryMany(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: Partial<{ page: number; limit: number }>;
      where?: Types.Repository.WhereBuilders.ClassOffering | undefined;
      orderBy?: Types.Repository.OrderBuilders.ClassOffering | undefined;
    }) {
      const { dbOrTx, constraints, where, orderBy } = args;

      const { page = 1, limit = 6 } = constraints ?? {};

      return await this._classOfferingRepo.execQuery({
        dbOrTx,
        fn: async (query) =>
          query.findMany({
            where,
            orderBy: orderBy
              ? Repositories.ClassOffering.sqlOrderBy(orderBy)
              : undefined,
            columns: { classId: false },
            with: {
              class: {
                columns: { id: true, classNumber: true },
                with: {
                  course: { columns: { code: true, name: true } },
                  professor: {
                    columns: {},
                    with: {
                      user: {
                        columns: {
                          firstName: true,
                          middleName: true,
                          surname: true,
                        },
                      },
                    },
                  },
                },
              },
              rooms: { columns: { name: true } },
            },
            limit,
            offset: (page - 1) * limit,
          }),
      });
    }
  }
}
