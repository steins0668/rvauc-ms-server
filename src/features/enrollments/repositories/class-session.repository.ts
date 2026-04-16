import { sql, SQL } from "drizzle-orm";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { classSessions } from "../../../models";
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
        }),
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

  public async queryMinimalShape(args: {
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
        classId: false,
        classOfferingId: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.ClassSession<T>,
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(classSessions);
    return await args.fn({
      table: classSessions,
      insert,
      converter: ClassSession.buildWhereClause,
      sql,
    });
  }

  public getContext<T>(args: Types.Repository.ContextArgs.ClassSession<T>) {
    const context = args.dbOrTx ?? this._dbContext;

    return args.fn({
      table: classSessions,
      context,
      converter: ClassSession.buildWhereClause,
      order: ClassSession.sqlOrderBy,
      sql,
    });
  }

  public getSubQuery<T>(args: Types.Repository.SubQueryArgs.ClassSession<T>) {
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

  public async execQuery<T>(args: Types.Repository.QueryArgs.ClassSession<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.classSessions;
    return await args.fn(query, ClassSession.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.ClassSession<T>,
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(classSessions);
    return await args.fn(update, ClassSession.buildWhereClause);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.ClassSession<T>,
  ) {
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
