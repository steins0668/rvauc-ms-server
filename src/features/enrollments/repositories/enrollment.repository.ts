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

  async queryWithStudentDetails(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["enrollments"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["enrollments"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy, dbOrTx } = args;

    return await (dbOrTx ?? this._dbContext).query.enrollments.findMany({
      where,
      orderBy,
      limit: RepositoryUtil.resolveLimit(args.constraints),
      offset: RepositoryUtil.resolveOffset(args.constraints),
      columns: { id: true, status: true },
      with: {
        student: {
          columns: { studentNumber: true, yearLevel: true, block: true },
          with: {
            user: {
              columns: {
                surname: true,
                firstName: true,
                middleName: true,
                gender: true,
              },
            },
            department: {
              columns: { name: true },
              with: { college: { columns: { name: true } } },
            },
          },
        },
      },
    });
  }

  /**
   * @description Selects a student linked to the current enrollment/s.
   */
  async selectStudentsFromEnrollments(args: {
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
        id: enrollments.id,
        status: enrollments.status,
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

  existsForStudent(args: {
    dbOrTx?: DbOrTx | undefined;
    enrollmentId: SQLiteColumn;
    studentId: number;
  }) {
    const { dbOrTx, enrollmentId, studentId } = args;
    return this.getContext({
      dbOrTx,
      fn: ({ table: e, context, converter }) =>
        context
          .select({ id: e.id })
          .from(e)
          .where(
            converter({
              custom: (e, { eq, and }) => [
                and(eq(e.id, enrollmentId), eq(e.studentId, studentId)),
              ],
            }),
          ),
    });
  }

  existsForClassAndStudent(args: {
    dbOrTx?: DbOrTx | undefined;
    classId: SQLiteColumn;
    studentId: number;
  }) {
    const { dbOrTx, classId, studentId } = args;
    return this.getContext({
      dbOrTx,
      fn: ({ table: e, context, converter }) =>
        context
          .select({ id: e.id })
          .from(e)
          .where(
            converter({
              custom: (e, { eq, and }) => [
                and(eq(e.classId, classId), eq(e.studentId, studentId)),
              ],
            }),
          ),
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

  public async execInsert<T>(args: Types.Repository.InsertArgs.Enrollment<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(enrollments);
    return await args.fn({
      table: enrollments,
      insert,
      converter: Enrollment.buildWhereClause,
      sql,
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

  /**
   * @deprecated
   * ! DO NOT USE!!
   * @param filter
   * @returns
   */
  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Enrollment,
  ): SQL | undefined {
    return undefined;
  }

  public static sqlWhere(builder: Types.Repository.WhereBuilders.Enrollment) {
    return builder(enrollments, RepositoryUtil.filters);
  }

  public static sqlOrderBy(builder: Types.Repository.OrderBuilders.Enrollment) {
    return builder(enrollments, RepositoryUtil.orderOperators);
  }
}
