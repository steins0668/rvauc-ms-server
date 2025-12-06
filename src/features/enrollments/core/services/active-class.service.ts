import { SQL } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { Enums } from "../../../../data";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { Types } from "../../types";

export namespace ActiveClass {
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
      const { dbOrTx, date, termId, studentId } = args;
      const day = Enums.Days[date.getDay()] as string;
      const weekDay = day.substring(0, 3);
      const seconds = TimeUtil.secondsSinceMidnightPh(date);

      //  ! for allowing attendance 30 minutes before class
      const offsetDate = new Date(date);
      offsetDate.setMinutes(offsetDate.getMinutes() + 30);
      const offsetSeconds = TimeUtil.secondsSinceMidnightPh(offsetDate);

      const subquery = (classOfferingId: SQLiteColumn) =>
        this.enrollmentSubquery({ dbOrTx, classOfferingId, studentId, termId });

      const sqlWhere: Types.Repository.WhereBuilders.ClassOffering = (
        co,
        { eq, and, or, lte, gt, exists }
      ) =>
        and(
          eq(co.weekDay, weekDay),
          or(
            //  ! class currently in session
            and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
            //  ! class starts in 30 minutes
            and(gt(co.startTime, seconds), lte(co.startTime, offsetSeconds))
          ),
          exists(subquery(co.id))
        );

      const orderBy: Types.Repository.OrderBuilders.ClassOffering = (
        c,
        { asc }
      ) => asc(c.startTime); //  ! ascending by start time

      let result;
      try {
        result = await this.queryOne({ dbOrTx, sqlWhere, orderBy });
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
      sqlWhere?: Types.Repository.WhereBuilders.ClassOffering;
      orderBy?: Types.Repository.OrderBuilders.ClassOffering;
    }) {
      const { dbOrTx, sqlWhere, orderBy } = args;

      return await this._classOfferingRepo.execQuery({
        dbOrTx,
        fn: async (query) =>
          query.findFirst({
            where: sqlWhere
              ? Repositories.ClassOffering.sqlWhere(sqlWhere)
              : undefined,
            orderBy: orderBy
              ? Repositories.ClassOffering.sqlOrderBy(orderBy)
              : undefined,
            columns: { classId: false },
            with: this._queryWith,
          }),
      });
    }
  }
}
