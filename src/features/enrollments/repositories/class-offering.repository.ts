import { and, eq, or, sql, SQL, SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx, TxContext } from "../../../db/create-context";
import { Enums } from "../../../data";
import { classOfferings, Schema } from "../../../models";
import { Repository } from "../../../services";
import { RepositoryUtil, TimeUtil } from "../../../utils";
import { BaseRepositoryType } from "../../../types";
import { Auth } from "../../auth";
import { Types } from "../types";

export class ClassOffering extends Repository<Types.Tables.ClassOffering> {
  public constructor(context: DbContext) {
    super(context, classOfferings);
  }

  getTimeFilters(args: { date: Date; mode: "now" | "now-or-next" }) {
    const { date, mode } = args;

    const { classOfferings: co } = Schema;
    const { or, and, lte, gt } = RepositoryUtil.filters;

    const seconds = TimeUtil.secondsSinceMidnightPh(date);

    switch (mode) {
      case "now":
        //  ! class currently in session
        return and(lte(co.startTime, seconds), gt(co.endTime, seconds));
      case "now-or-next":
        return or(
          //  ! class currently in sesion
          and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
          //  ! next class
          gt(co.startTime, seconds),
        );
      default:
        return undefined;
    }
  }

  async getActiveOffering(args: {
    values: { date: Date; termId: number; userId: number };
    role: keyof typeof Auth.Core.Data.Records.roles;
    mode: "now" | "now-or-next";
    tx?: TxContext | undefined;
  }) {
    return await this.queryWithClassAndProfessor({
      constraints: { limit: 1 },
      where: this.getActiveOfferingWhereClause(args),
      orderBy: (co, { asc }) => asc(co.startTime),
      dbOrTx: args.tx,
    }).then((r) => r[0]);
  }

  async getMinimalShapesForWeekday(args: {
    values: { weekDay: string; termId: number };
    tx?: TxContext | undefined;
  }) {
    const { values, tx } = args;

    return await (args.tx ?? this._dbContext).query.classOfferings.findMany({
      where: (co, { and, eq, exists }) =>
        and(
          eq(co.weekDay, values.weekDay),
          exists(
            this.getClassSubquery({
              values: { classId: co.classId, termId: values.termId },
              tx,
            }),
          ),
        ),
      columns: {
        id: true,
        classId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async queryWithClass(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["classOfferings"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["classOfferings"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy, dbOrTx } = args;
    const { limit = 6, offset = undefined } = args.constraints ?? {};

    return await (dbOrTx ?? this._dbContext).query.classOfferings.findMany({
      orderBy,
      limit,
      offset,
      where,
      columns: { classId: false },
      with: {
        class: {
          columns: { id: true, classNumber: true, professorId: true },
          with: {
            course: { columns: { code: true, name: true } },
          },
        },
        rooms: { columns: { name: true } },
      },
    });
  }

  async queryWithClassAndProfessor(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["classOfferings"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["classOfferings"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy, dbOrTx } = args;
    const { limit = 6, offset = undefined } = args.constraints ?? {};

    return await (dbOrTx ?? this._dbContext).query.classOfferings.findMany({
      orderBy,
      limit,
      offset,
      where,
      columns: { classId: false },
      with: {
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
    });
  }

  async execInsert<T>(args: Types.Repository.InsertArgs.ClassOffering<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(classOfferings);
    return await args.fn({
      table: classOfferings,
      insert,
      converter: ClassOffering.buildWhereClause,
      sql,
    });
  }

  public getContext<T>(args: Types.Repository.ContextArgs.ClassOffering<T>) {
    const context = args.dbOrTx ?? this._dbContext;

    return args.fn({
      table: classOfferings,
      context,
      converter: ClassOffering.buildWhereClause,
      order: ClassOffering.sqlOrderBy,
      sql,
    });
  }

  public getSubQuery<T>(args: Types.Repository.SubQueryArgs.ClassOffering<T>) {
    const selectBase = (args.dbOrTx ?? this._dbContext)
      .select()
      .from(classOfferings);

    return args.fn({
      table: classOfferings,
      selectBase,
      converter: ClassOffering.buildWhereClause,
      order: ClassOffering.sqlOrderBy,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.ClassOffering<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.classOfferings;
    return await args.fn(query, ClassOffering.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.ClassOffering<T>,
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(classOfferings);
    return await args.fn(update, ClassOffering.buildWhereClause);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.ClassOffering<T>,
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(classOfferings);
    return await args.fn(deleteBase, ClassOffering.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.ClassOffering,
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const {
        filterType = "or",
        id,
        classId,
        weekDay,
        startTime,
        endTime,
        custom,
      } = filter;

      if (id !== undefined) conditions.push(eq(classOfferings.id, id));
      if (classId !== undefined)
        conditions.push(eq(classOfferings.classId, classId));
      if (weekDay && weekDay.trim())
        conditions.push(eq(classOfferings.weekDay, weekDay));
      if (startTime !== undefined)
        conditions.push(eq(classOfferings.startTime, startTime));
      if (endTime !== undefined)
        conditions.push(eq(classOfferings.endTime, endTime));
      if (custom)
        conditions.push(...custom(classOfferings, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  public static sqlOrderBy(
    builder: Types.Repository.OrderBuilders.ClassOffering,
  ) {
    return builder(classOfferings, RepositoryUtil.orderOperators);
  }

  private getActiveOfferingWhereClause(
    args: Parameters<typeof this.getActiveOffering>[0],
  ): Types.Repository.WhereBuilders.ClassOffering {
    const { tx, role, mode } = args;
    const { date, userId, termId } = args.values;

    const { classes: c, enrollments: e } = Schema;
    const { eq, and } = RepositoryUtil.filters;

    const context = args.tx ?? this._dbContext;

    const subqueryE = (args: { classId: SQLiteColumn; studentId: number }) =>
      context
        .select({ id: e.id })
        .from(e)
        .where(
          and(eq(e.classId, args.classId), eq(e.studentId, args.studentId)),
        );

    return (co, { and, eq, exists, gt, lte }) => {
      const day = Enums.Days[date.getDay()] as string;
      const weekDay = day.substring(0, 3);

      const conditions: (SQLWrapper | undefined)[] = [
        eq(co.weekDay, weekDay),
        exists(
          this.getClassSubquery({
            values: {
              classId: co.classId,
              termId,
              professorId: role === "professor" ? userId : undefined,
            },
            tx,
          }),
        ),
      ];

      if (role === "student")
        conditions.push(
          exists(subqueryE({ classId: co.classId, studentId: userId })),
        ); //  ! professors don't need enrollments subquery

      const seconds = TimeUtil.secondsSinceMidnightPh(date);

      switch (mode) {
        case "now":
          //  ! class currently in session
          conditions.push(
            and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
          );
        case "now-or-next":
          conditions.push(
            or(
              //  ! class currently in sesion
              and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
              //  ! next class
              gt(co.startTime, seconds),
            ),
          );

          return conditions.length ? and(...conditions) : undefined;
      }
    };
  }

  private getClassSubquery(args: {
    values: {
      classId: SQLiteColumn;
      termId: number;
      professorId?: number | undefined;
    };
    tx?: TxContext | undefined;
  }) {
    const { classId, termId, professorId } = args.values;
    const { classes: c } = Schema;

    const context = args.tx ?? this._dbContext;
    const conditions = [eq(c.id, classId), eq(c.termId, termId)];

    //  ! used when querying class offerings for professors
    if (professorId !== undefined)
      conditions.push(eq(c.professorId, professorId));

    return context
      .select({ id: c.id })
      .from(c)
      .where(and(...conditions));
  }
}
