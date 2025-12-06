import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Enums } from "../../../../data";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Types } from "../../types";
import { SQL, SQLWrapper } from "drizzle-orm";

export namespace ClassSchedule {
  export async function createService() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const enrollmentRepo = new Repositories.Enrollment(context);

    return new Service({ classOfferingRepo, enrollmentRepo });
  }

  export class Service {
    private readonly _enrollmentRepo: Repositories.Enrollment;
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _queryWith = {
      enrollment: {
        columns: { id: true, status: true },
      },
      class: {
        columns: {},
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
    } as const;

    public constructor(args: {
      classOfferingRepo: Repositories.ClassOffering;
      enrollmentRepo: Repositories.Enrollment;
    }) {
      this._classOfferingRepo = args.classOfferingRepo;
      this._enrollmentRepo = args.enrollmentRepo;
    }

    public async getForNow(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      studentId: number;
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
          })
        );
      }

      if (!result)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
            message:
              "This student has neither an ongoing class or a class that starts in 30 minutes.",
          })
        );

      return this.toDto(result);
    }

    public async getForToday(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      termId: number;
      studentId: number;
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
          })
        );
      }

      if (result.length === 0)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR",
            message: "This student has no classes for today.",
          })
        );

      return result.map((row) => this.toDto(row));
    }

    private whereClassOffering(args: {
      dbOrTx?: DbOrTx | undefined;
      date: Date;
      studentId: number;
      termId: number;
      mode: "today" | "now";
    }): Types.Repository.WhereBuilders.ClassOffering {
      const { dbOrTx, date, studentId, termId, mode } = args;

      const day = Enums.Days[date.getDay()] as string;
      const weekDay = day.substring(0, 3);

      const subquery = (classOfferingId: SQLiteColumn) =>
        this.enrollmentSubquery({ dbOrTx, classOfferingId, studentId, termId });

      return (co, { eq, and, or, lte, gt, exists }) => {
        const conditions = [];

        conditions.push(eq(co.weekDay, weekDay));
        conditions.push(exists(subquery(co.id)));

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
              and(gt(co.startTime, seconds), lte(co.startTime, offsetSeconds))
            )
          );
        }

        return and(...conditions);
      };
    }

    private orderByStartTimeAscending(): Types.Repository.OrderBuilders.ClassOffering {
      return (co, { asc }) => asc(co.startTime);
    }

    private enrollmentSubquery(args: {
      dbOrTx?: DbOrTx | undefined;
      classOfferingId: SQLiteColumn;
      studentId: number;
      termId: number;
    }) {
      const { dbOrTx, classOfferingId, studentId, termId } = args;
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
                    eq(e.termId, termId)
                  ),
                ],
              })
            ),
      });
    }

    private toDto(raw: NonNullable<Awaited<ReturnType<typeof this.queryOne>>>) {
      const { course, professor } = raw.class;

      const dto: Schemas.Dto.ActiveClass = {
        id: raw.id,
        weekDay: raw.weekDay,
        startTimeText: raw.startTimeText,
        endTimeText: raw.endTimeText,
        startTime: raw.startTime,
        endTime: raw.endTime,
        classNumber: raw.classNumber,
        courseCode: course.code,
        courseName: course.name,
        professor: professor.user,
      };

      const parsed = Schemas.Dto.activeClass.safeParse(dto);

      return parsed.success
        ? ResultBuilder.success(parsed.data)
        : ResultBuilder.fail(
            Errors.EnrollmentData.normalizeError({
              name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
              message: "Failed converting raw query data into enrollment DTO",
              err: parsed.error,
            })
          );
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
            with: this._queryWith,
            limit,
            offset: (page - 1) * limit,
          }),
      });
    }
  }
}
