import { SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Enums } from "../../../../data";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Data } from "../data";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

export namespace ClassEndDetection {
  export async function create() {
    const context = await createContext();
    const classRepo = new Repositories.Class(context);
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const enrollmentRepo = new Repositories.Enrollment(context);

    return new Service({ classRepo, classOfferingRepo, enrollmentRepo });
  }
  /**
   * todo: merge this with class schedule service
   * todo: add a WithBuilder repo type so you can dynamically choose to include enrollments in the query
   * todo: add a type: 'student' | 'all' discriminator to the method args so you can choose to get just one enrollment or all
   */
  export class Service {
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _classRepo: Repositories.Class;
    private readonly _enrollmentRepo: Repositories.Enrollment;

    public constructor(args: {
      classOfferingRepo: Repositories.ClassOffering;
      classRepo: Repositories.Class;
      enrollmentRepo: Repositories.Enrollment;
    }) {
      this._classOfferingRepo = args.classOfferingRepo;
      this._classRepo = args.classRepo;
      this._enrollmentRepo = args.enrollmentRepo;
    }

    public async getForNow(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
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
            message: "There is no class that has already ended.",
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
            message: "There are no classes for today.",
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

    public async getForWeek(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
    }) {
      let result;
      try {
        result = await this.queryMany({
          dbOrTx: args.dbOrTx,
          where: this.whereClassOffering({ ...args, mode: "week" }),
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
            message: "There are no classes for this week.",
          }),
        );

      try {
        const parsed = result.map((row) => this.toDto(row));
        return ResultBuilder.success(parsed);
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollments DTO",
            err,
          }),
        );
      }
    }

    private whereClassOffering(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      mode: "week" | "today" | "now";
    }): Types.Repository.WhereBuilders.ClassOffering {
      const { dbOrTx, date, termId, mode } = args;

      const subqueryC = (termId: number) =>
        this.classSubquery({ dbOrTx, termId });
      const subqueryE = (classOfferingId: SQLiteColumn) =>
        this.enrollmentSubquery({ dbOrTx, classOfferingId });

      return (co, { eq, and, lte, exists }) => {
        const conditions: (SQLWrapper | undefined)[] = [];

        conditions.push(exists(subqueryC(termId)));
        conditions.push(exists(subqueryE(co.id)));

        if (mode !== "week") {
          const day = Enums.Days[date.getDay()] as string;
          const weekDay = day.substring(0, 3);
          conditions.push(eq(co.weekDay, weekDay));
        }

        if (mode === "now") {
          const seconds = TimeUtil.secondsSinceMidnightPh(date);

          conditions.push(lte(co.endTime, seconds));
        }

        return conditions.length ? and(...conditions) : undefined;
      };
    }

    private orderByStartTimeAscending(): Types.Repository.OrderBuilders.ClassOffering {
      return (co, { asc }) => asc(co.startTime);
    }

    private classSubquery(args: {
      dbOrTx?: DbOrTx | undefined;
      termId: number;
    }) {
      const { dbOrTx, termId } = args;
      return this._classRepo.getContext({
        dbOrTx,
        fn: ({ table: c, context }) =>
          context
            .select({ id: c.id })
            .from(c)
            .where(RepositoryUtil.filters.eq(c.termId, termId)),
      });
    }

    private enrollmentSubquery(args: {
      dbOrTx?: DbOrTx | undefined;
      classOfferingId: SQLiteColumn;
    }) {
      const { dbOrTx, classOfferingId } = args;

      const { eq, and } = RepositoryUtil.filters;

      return this._enrollmentRepo.getContext({
        dbOrTx,
        fn: ({ table: e, context }) =>
          context
            .select({ id: e.id })
            .from(e)
            .where(
              and(
                eq(e.classOfferingId, classOfferingId),
                eq(e.status, Data.enrollmentStatus.enrolled),
              ),
            ),
      });
    }

    private toDto(
      classOffering: NonNullable<Awaited<ReturnType<typeof this.queryOne>>>,
    ): Schemas.Dto.ClassEndDetection {
      const { class: class_, enrollments } = classOffering;
      const { course, professor } = class_;

      return Schemas.Dto.classEndDetection.parse({
        class: {
          id: class_.id,
          classNumber: class_.classNumber,
          course,
          offering: {
            id: classOffering.id,
            weekDay: classOffering.weekDay,
            room: classOffering.rooms?.name ?? "N/A",
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
        enrollments,
      });
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
            columns: { classId: false, roomId: false },
            with: {
              enrollments: {
                columns: { id: true, studentId: true, status: true },
              },
              class: {
                columns: { id: true, classNumber: true },
                with: {
                  course: { columns: { code: true, name: true } },
                  professor: {
                    columns: { facultyRank: true },
                    with: {
                      college: { columns: { name: true } },
                      user: {
                        columns: {
                          firstName: true,
                          middleName: true,
                          surname: true,
                          gender: true,
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
