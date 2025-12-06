import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { departments } from "../../../models";
import { Repository } from "../../../services";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Department extends Repository<Types.Tables.Department> {
  public constructor(context: DbContext) {
    super(context, departments);
  }
  public async execInsert<T>(args: Types.Repository.InsertArgs.Department<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(departments);
    return await args.fn({
      table: departments,
      insert,
      converter: Department.buildWhereClause,
      sql,
    });
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Department
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, collegeId, name, custom } = filter;

      if (id !== undefined) conditions.push(eq(departments.id, id));
      if (collegeId !== undefined)
        conditions.push(eq(departments.collegeId, collegeId));
      if (name && name.trim()) conditions.push(eq(departments.name, name));
      if (custom)
        conditions.push(...custom(departments, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }
}
