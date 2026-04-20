import { sql, SQL, SQLWrapper } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx, TxContext } from "../../../db/create-context";
import { classSessions, Schema } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

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

  async getOfferingActiveSession(args: {
    values: { classOfferingId: number; date: Date };
    mode: "now" | "now-or-next";
    tx?: TxContext | undefined;
  }) {
    const { mode } = args;
    const { classOfferingId, date } = args.values;

    return await this.getMinimalShape({
      constraints: { limit: 1 },
      where: (cs, { and, eq, gt, lte, or }) => {
        const conditions: (SQLWrapper | undefined)[] = [
          eq(cs.classOfferingId, classOfferingId),
        ];

        const ms = date.getTime();

        switch (mode) {
          case "now":
            //  ! class currently in session
            conditions.push(and(lte(cs.startTimeMs, ms), gt(cs.endTimeMs, ms)));
            break;
          case "now-or-next":
            conditions.push(
              or(
                //  ! class currently in sesion
                and(lte(cs.startTimeMs, ms), gt(cs.endTimeMs, ms)),
                //  ! next class
                gt(cs.startTimeMs, ms),
              ),
            );
            break;
        }

        return and(...conditions);
      },
      orderBy: (cs, { asc }) => asc(cs.startTimeMs),
      dbOrTx: args.tx,
    }).then((r) => r[0]);
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
      columns: {},
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

  getContext<T>(args: Types.Repository.ContextArgs.ClassSession<T>) {
    const context = args.dbOrTx ?? this._dbContext;

    return args.fn({
      table: classSessions,
      context,
      converter: ClassSession.buildWhereClause,
      order: ClassSession.sqlOrderBy,
      sql,
    });
  }

  getSubQuery<T>(args: Types.Repository.SubQueryArgs.ClassSession<T>) {
    const selectBase = (args.dbOrTx ?? this._dbContext)
      .select()
      .from(classSessions);

    return args.fn({
      table: classSessions,
      selectBase,
      converter: ClassSession.buildWhereClause,
      order: ClassSession.sqlOrderBy,
    });
  }

  async execQuery<T>(args: Types.Repository.QueryArgs.ClassSession<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.classSessions;
    return await args.fn(query, ClassSession.buildWhereClause);
  }

  async execUpdate<T>(args: Types.Repository.UpdateArgs.ClassSession<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(classSessions);
    return await args.fn(update, ClassSession.buildWhereClause);
  }

  async execDelete<T>(args: Types.Repository.DeleteArgs.ClassSession<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(classSessions);
    return await args.fn(deleteBase, ClassSession.buildWhereClause);
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

  public static sqlOrderBy(
    builder: Types.Repository.OrderBuilders.ClassSession,
  ) {
    return builder(classSessions, RepositoryUtil.orderOperators);
  }
}
