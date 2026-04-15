import { ResultSet } from "@libsql/client/.";
import { and, eq, or, sql, SQL } from "drizzle-orm";
import { SQLiteColumn, SQLiteSelectBase } from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { Schema } from "../../../models";
import { enrollments } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Enrollment extends Repository<Types.Tables.Enrollment> {
  public constructor(context: DbContext) {
    super(context, enrollments);
  }

  public async countEnrollments(args: {
    where?: SQL | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, dbOrTx } = args;

    const { enrollments } = Schema;

    return await (dbOrTx ?? this._dbContext).$count(enrollments, where);
  }

  public existsForStudentAndOffering(args: {
    dbOrTx?: DbOrTx | undefined;
    classOfferingId: SQLiteColumn;
    studentId: number;
  }) {
    const { dbOrTx, classOfferingId, studentId } = args;
    return this.getContext({
      dbOrTx,
      fn: ({ table: e, context, converter }) =>
        context
          .select({ id: e.id })
          .from(e)
          .where(
            converter({
              custom: (e, { eq, and }) => [
                and(
                  eq(e.classOfferingId, classOfferingId),
                  eq(e.studentId, studentId),
                ),
              ],
            }),
          ),
    });
  }

  /**
   * @description Selects a student linked to the current enrollment/s.
   */
  public async selectStudentsFromEnrollments(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?: SQL;
    orderBy?: Parameters<
      SQLiteSelectBase<
        "enrollments",
        "async",
        ResultSet,
        Types.Tables.Enrollment["_"]["columns"]
      >["orderBy"]
    >;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy } = args;
    const { limit = 6, offset = 0 } = args.constraints ?? {};

    const { departments, enrollments, students, users } = Schema;
    const { eq } = RepositoryUtil.filters;

    const query = (args.dbOrTx ?? this._dbContext)
      .select({
        student: {
          id: students.id,
          studentNumber: students.studentNumber,
          department: departments.name,
          yearLevel: students.yearLevel,
          block: students.block,
          gender: users.gender,
          surname: users.surname,
          firstName: users.firstName,
          middleName: users.middleName,
        },
      })
      .from(enrollments)
      .innerJoin(students, eq(enrollments.studentId, students.id))
      .leftJoin(departments, eq(students.departmentId, departments.id))
      .innerJoin(users, eq(students.id, users.id))
      .limit(limit)
      .offset(offset);

    if (where !== undefined) query.where(where);
    if (orderBy !== undefined)
      Array.isArray(orderBy)
        ? query.orderBy(...orderBy)
        : query.orderBy(orderBy);

    return await query;
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Enrollment<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(enrollments);
    return await args.fn({
      table: enrollments,
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
      order: Enrollment.sqlOrderBy,
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
      order: Enrollment.sqlOrderBy,
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
    filter?: Types.Repository.QueryFilters.Enrollment,
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const {
        filterType = "or",
        id,
        studentId,
        classOfferingId,
        status,
        custom,
      } = filter;

      if (id !== undefined) conditions.push(eq(enrollments.id, id));
      if (studentId !== undefined)
        conditions.push(eq(enrollments.studentId, studentId));
      if (classOfferingId !== undefined)
        conditions.push(eq(enrollments.classOfferingId, classOfferingId));
      if (status && status.trim())
        conditions.push(eq(enrollments.status, status));
      if (custom)
        conditions.push(...custom(enrollments, RepositoryUtil.filters));

      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  public static sqlWhere(builder: Types.Repository.WhereBuilders.Enrollment) {
    return builder(enrollments, RepositoryUtil.filters);
  }

  public static sqlOrderBy(builder: Types.Repository.OrderBuilders.Enrollment) {
    return builder(enrollments, RepositoryUtil.orderOperators);
  }
}
