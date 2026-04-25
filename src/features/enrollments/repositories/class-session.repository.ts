import { sql, SQL, SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx, TxContext } from "../../../db/create-context";
import { classSessions, Schema } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";
import { Core } from "../core";

export class ClassSession extends Repository<Types.Tables.ClassSession> {
  public constructor(context: DbContext) {
    super(context, classSessions);
  }

  async getLatest(args?: { dbOrTx?: DbOrTx | undefined }) {
    return await this.execQuery({
      dbOrTx: args?.dbOrTx,
      fn: async (query) =>
        query.findFirst({
          orderBy: (cs, { desc }) => desc(cs.startTimeMs),
          columns: { startTimeMs: true },
        }),
    });
  }

  async getProfessorActiveClass(args: {
    values: {
      termId: number;
      professorId: number;
      datePh: string;
      timeMs: number;
    };
    mode: "now" | "now-or-next";
    tx?: TxContext | undefined;
  }) {
    const context = args.tx ?? this._dbContext;

    const {
      classes: cls,
      classOfferings: co,
      classSessions: cs,
      courses: c,
      rooms: r,
    } = Schema;
    const { and, eq } = RepositoryUtil.filters;
    const { asc } = RepositoryUtil.orderOperators;

    const baseShape = this.getActiveClassQueryBaseShape(args.values.timeMs);
    const baseFilter = this.getActiveClassQueryBaseFilters(args);

    const [result] = await context
      .select(baseShape)
      .from(cls)
      .innerJoin(c, eq(c.id, cls.courseId))
      .innerJoin(co, eq(co.classId, cls.id))
      .innerJoin(cs, eq(cs.classOfferingId, co.id))
      .leftJoin(r, eq(r.id, co.roomId))
      .where(and(eq(cls.professorId, args.values.professorId), baseFilter))
      .orderBy(asc(cs.startTimeMs))
      .limit(1);

    return result;
  }

  async getStudentActiveClass(args: {
    values: {
      termId: number;
      studentId: number;
      datePh: string;
      timeMs: number;
    };
    mode: "now" | "now-or-next";
    tx?: TxContext | undefined;
  }) {
    const context = args.tx ?? this._dbContext;

    const {
      classes: cls,
      classOfferings: co,
      classSessions: cs,
      courses: c,
      enrollments: e,
      users: u,
      rooms: r,
    } = Schema;
    const { and, eq } = RepositoryUtil.filters;
    const { asc } = RepositoryUtil.orderOperators;

    const baseShape = this.getActiveClassQueryBaseShape(args.values.timeMs);
    const baseFilter = this.getActiveClassQueryBaseFilters(args);

    const [result] = await context
      .select({
        ...baseShape,
        session: {
          ...baseShape.session,
          startTimeMs: cs.startTimeMs,
          endTimeMs: cs.endTimeMs,
        },
        enrollment: { id: e.id, status: e.status },
        professor: {
          id: u.id,
          surname: u.surname,
          firstName: u.firstName,
          middleName: u.middleName,
        },
      })
      .from(cls)
      .innerJoin(c, eq(c.id, cls.courseId))
      .innerJoin(co, eq(co.classId, cls.id))
      .innerJoin(cs, eq(cs.classOfferingId, co.id))
      .innerJoin(u, eq(u.id, cls.professorId))
      .innerJoin(e, eq(e.classId, cls.id))
      .leftJoin(r, eq(r.id, co.roomId))
      .where(and(eq(e.studentId, args.values.studentId), baseFilter))
      .orderBy(asc(cs.startTimeMs))
      .limit(1);

    return result;
  }

  private getActiveClassQueryBaseShape(timeMs: number) {
    const {
      classes: cls,
      classOfferings: co,
      classSessions: cs,
      courses: c,
      rooms: r,
    } = Schema;

    return {
      class: { id: cls.id, classNumber: cls.classNumber },
      course: { name: c.name, code: c.code },
      offering: {
        id: co.id,
        weekDay: co.weekDay,
        startTimeText: co.startTimeText,
        endTimeText: co.endTimeText,
      },
      session: {
        id: cs.id,
        datePh: cs.datePh,
        status: cs.status,
        runtimeStatus: sql<"ongoing" | "next" | null>`
          CASE
            WHEN ${cs.status} != ${Core.Data.classSessionStatus.scheduled}
              THEN null
            WHEN ${cs.startTimeMs} <= ${timeMs}
              AND ${cs.endTimeMs} > ${timeMs}
              THEN 'ongoing'
            WHEN ${cs.startTimeMs} > ${timeMs}
              THEN 'next'
            ELSE null
          END
        `,
      },
      room: { name: r.name, building: r.building },
    };
  }

  private getActiveClassQueryBaseFilters(args: {
    values: { termId: number; datePh: string; timeMs: number };
    mode: "now" | "now-or-next";
  }) {
    const { termId, datePh, timeMs } = args.values;

    const { classes: cls, classSessions: cs } = Schema;
    const { and, eq, gt, lte, or } = RepositoryUtil.filters;

    const ongoingFilter = and(
      lte(cs.startTimeMs, timeMs),
      gt(cs.endTimeMs, timeMs),
    );

    const timeFilter =
      args.mode === "now"
        ? ongoingFilter
        : or(ongoingFilter, gt(cs.startTimeMs, timeMs));

    return and(eq(cls.termId, termId), eq(cs.datePh, datePh), timeFilter);
  }

  async getWithClassAndOffering(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["classSessions"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["classSessions"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    return await (args.dbOrTx ?? this._dbContext).query.classSessions.findMany({
      limit: RepositoryUtil.resolveLimit(args.constraints),
      offset: RepositoryUtil.resolveOffset(args.constraints),
      where: args.where,
      orderBy: args.orderBy,
      columns: { id: true, status: true, datePh: true },
      with: {
        class: {
          columns: { id: true, classNumber: true, professorId: true },
          with: {
            course: { columns: { code: true, name: true } },
          },
        },
        classOffering: {
          columns: { classId: false },
          with: { rooms: { columns: { name: true } } },
        },
      },
    });
  }

  async getWithEnrollments(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["classSessions"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["classSessions"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    return await this.execQuery({
      dbOrTx: args.dbOrTx,
      fn: async (query) =>
        query.findMany({
          where: args.where,
          orderBy: args.orderBy,
          columns: { id: true, startTimeMs: true, endTimeMs: true },
          with: {
            classOffering: {
              columns: { id: true, classId: true },
              with: {
                enrollments: {
                  columns: { id: true, studentId: true, status: true },
                },
              },
            },
          },
        }),
    });
  }

  async getAllUntilDate(args: {
    values: {
      date: Date;
      classId: number;
      professorId: number;
      termId: number;
    };
    constraints?: BaseRepositoryType.QueryConstraints;
    tx?: TxContext | undefined;
  }) {
    const { date, classId, professorId, termId } = args.values;

    const context = args.tx ?? this._dbContext;

    const { classes: c } = Schema;
    const { and, eq } = RepositoryUtil.filters;

    const classSubquery = (args: {
      id: SQLiteColumn;
      professorId: number;
      termId: number;
    }) =>
      context
        .select({ id: c.id })
        .from(c)
        .where(
          and(
            eq(c.id, args.id),
            eq(c.professorId, args.professorId),
            eq(c.termId, args.termId),
          ),
        );

    return await this.getMinimalShape({
      where: (cs, { and, eq, exists, lte }) =>
        and(
          eq(cs.classId, classId),
          lte(cs.startTimeMs, date.getTime()),
          exists(classSubquery({ id: cs.classId, professorId, termId })),
        ),
      orderBy: (cs, { desc }) => desc(cs.startTimeMs),
      constraints: args.constraints,
      dbOrTx: args.tx,
    });
  }

  async getWithClassForValidation(args: {
    values: { id: number };
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { id } = args.values;
    const context = args.dbOrTx ?? this._dbContext;

    const { classes: c, classSessions: cs } = Schema;
    const { eq } = RepositoryUtil.filters;

    return await context
      .select({
        class: {
          id: c.id,
          professorId: c.professorId,
        },
        session: {
          id: cs.id,
          status: cs.status,
          datePh: cs.datePh,
          startTimeMs: cs.startTimeMs,
          endTimeMs: cs.endTimeMs,
        },
      })
      .from(cs)
      .innerJoin(c, eq(c.id, cs.classId))
      .where(eq(cs.id, id))
      .limit(1)
      .then((r) => r[0]);
  }

  async getMinimalShape(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["classSessions"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["classSessions"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy, dbOrTx } = args;
    const { limit = 6, offset = undefined } = args.constraints ?? {};

    return await (dbOrTx ?? this._dbContext).query.classSessions.findMany({
      where,
      orderBy,
      limit,
      offset,
      columns: {
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  async execInsert<T>(args: Types.Repository.InsertArgs.ClassSession<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(classSessions);
    return await args.fn({
      table: classSessions,
      insert,
      converter: ClassSession.buildWhereClause,
      sql,
    });
  }

  async execQuery<T>(args: Types.Repository.QueryArgs.ClassSession<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.classSessions;
    return await args.fn(query, ClassSession.buildWhereClause);
  }

  /**
   * @deprecated
   * ! Don't use!!!
   * @returns
   */
  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.ClassSession,
  ): SQL | undefined {
    return undefined;
  }
}
