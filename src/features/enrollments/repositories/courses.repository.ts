import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { courses } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Course extends Repository<Types.Tables.Course> {
  public constructor(context: DbContext) {
    super(context, courses);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Course<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(courses);
    return await args.fn({
      table: courses,
      insert,
      converter: Course.buildWhereClause,
      sql,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Course<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.courses;
    return await args.fn(query, Course.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.Course<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(courses);
    return await args.fn(update, Course.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.Course<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(courses);
    return await args.fn(deleteBase, Course.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Course
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, code, name, units, custom } = filter;

      if (id !== undefined) conditions.push(eq(courses.id, id));
      if (code && code.trim()) conditions.push(eq(courses.code, code));
      if (name && name.trim()) conditions.push(eq(courses.name, name));
      if (units !== undefined) conditions.push(eq(courses.units, units));
      if (custom) conditions.push(...custom(courses, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  protected static buildOrder(
    configureOrder: BaseRepositoryType.ConfigureOrder<Types.Tables.Course>
  ) {
    return configureOrder(courses, RepositoryUtil.orderOperators);
  }
}
