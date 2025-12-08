import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { classes } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Class extends Repository<Types.Tables.Class> {
  public constructor(context: DbContext) {
    super(context, classes);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Class<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(classes);
    return await args.fn({
      table: classes,
      insert,
      converter: Class.buildWhereClause,
      sql,
    });
  }

  public getContext<T>(args: Types.Repository.ContextArgs.Class<T>) {
    const context = args.dbOrTx ?? this._dbContext;

    return args.fn({
      table: classes,
      context,
      converter: Class.buildWhereClause,
      order: Class.sqlOrderBy,
      sql,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Class<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.classes;
    return await args.fn(query, Class.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.Class<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(classes);
    return await args.fn(update, Class.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.Class<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(classes);
    return await args.fn(deleteBase, Class.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Class
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, professorId, courseId, custom } = filter;

      if (id !== undefined) conditions.push(eq(classes.id, id));
      if (professorId !== undefined)
        conditions.push(eq(classes.professorId, professorId));
      if (courseId !== undefined)
        conditions.push(eq(classes.courseId, courseId));
      if (custom) conditions.push(...custom(classes, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  public static sqlWhere(builder: Types.Repository.WhereBuilders.Class) {
    return builder(classes, RepositoryUtil.filters);
  }

  public static sqlOrderBy(
    builder: BaseRepositoryType.OrderBuilder<Types.Tables.Class>
  ) {
    return builder(classes, RepositoryUtil.orderOperators);
  }
}
