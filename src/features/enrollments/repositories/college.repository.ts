import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { colleges } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class College extends Repository<Types.Tables.College> {
  public constructor(context: DbContext) {
    super(context, colleges);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.College<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(colleges);
    return await args.fn({
      insert,
      converter: College.buildWhereClause,
      sql,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.College<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.colleges;
    return await args.fn(query, College.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.College<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(colleges);
    return await args.fn(update, College.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.College<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(colleges);
    return await args.fn(deleteBase, College.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.College
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, name, custom } = filter;

      if (id !== undefined) conditions.push(eq(colleges.id, id));
      if (name && name.trim()) conditions.push(eq(colleges.name, name));
      if (custom) conditions.push(...custom(colleges, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  protected static buildOrder(
    configureOrder: BaseRepositoryType.ConfigureOrder<Types.Tables.College>
  ) {
    return configureOrder(colleges, RepositoryUtil.orderOperators);
  }
}
