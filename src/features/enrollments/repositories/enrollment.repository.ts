import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { enrollments } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Enrollment extends Repository<Types.Tables.Enrollment> {
  public constructor(context: DbContext) {
    super(context, enrollments);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Enrollment<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(enrollments);
    return await args.fn({
      insert,
      converter: Enrollment.buildWhereClause,
      sql,
    });
  }

  public getContext<T>(args: Types.Repository.ContextArgs.Enrollment<T>) {
    const context = args.dbOrTx ?? this._dbContext;

    return args.fn({
      table: enrollments,
      context,
      converter: Enrollment.buildWhereClause,
      order: Enrollment.buildOrder,
      sql,
    });
  }

  public getSubQuery<T>(args: Types.Repository.SubQueryArgs.Enrollment<T>) {
    const selectBase = (args.dbOrTx ?? this._dbContext)
      .select()
      .from(enrollments);

    return args.fn({
      table: enrollments,
      selectBase,
      converter: Enrollment.buildWhereClause,
      order: Enrollment.buildOrder,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Enrollment<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.enrollments;
    return await args.fn(query, Enrollment.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.Enrollment<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(enrollments);
    return await args.fn(update, Enrollment.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.Enrollment<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(enrollments);
    return await args.fn(deleteBase, Enrollment.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Enrollment
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const {
        filterType = "or",
        id,
        studentId,
        classOfferingId,
        termId,
        status,
        custom,
      } = filter;

      if (id !== undefined) conditions.push(eq(enrollments.id, id));
      if (studentId !== undefined)
        conditions.push(eq(enrollments.studentId, studentId));
      if (classOfferingId !== undefined)
        conditions.push(eq(enrollments.classOfferingId, classOfferingId));
      if (termId !== undefined) conditions.push(eq(enrollments.termId, termId));
      if (status && status.trim())
        conditions.push(eq(enrollments.status, status));
      if (custom)
        conditions.push(...custom(enrollments, RepositoryUtil.filters));

      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  protected static buildOrder(
    configureOrder: BaseRepositoryType.ConfigureOrder<Types.Tables.Enrollment>
  ) {
    return configureOrder(enrollments, RepositoryUtil.orderOperators);
  }
}
