import { sql, SQL } from "drizzle-orm";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { classSessions } from "../../../models";
import { Repository } from "../../../services";
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
