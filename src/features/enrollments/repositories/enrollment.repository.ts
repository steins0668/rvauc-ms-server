import { ResultSet } from "@libsql/client/.";
import { min, sql, SQL } from "drizzle-orm";
import { SQLiteSelectBase } from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx, TxContext } from "../../../db/create-context";
import { classSessions, Schema } from "../../../models";
import { enrollments } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Core } from "../core";
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

  async getEnrollmentsWithSchedule(args: {
    values: {
      studentId: number;
      datePh: string;
      timeMs: number;
      termId: number;
    };
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { studentId, termId, datePh, timeMs } = args.values;
    const context = args.dbOrTx ?? this._dbContext;

    const {
      classes: cls,
      courses: c,
      classSessions: cs,
      enrollments: e,
      classOfferings: o,
      rooms: r,
      users: u,
    } = Schema;
    const { and, eq } = RepositoryUtil.filters;
    const { asc } = RepositoryUtil.orderOperators;

    const weight = sql<number>`
      CASE
        WHEN ${cs.startTimeMs} <= ${timeMs}
        AND ${cs.endTimeMs} > ${timeMs}
        THEN 0
        WHEN ${cs.startTimeMs} > ${timeMs}
        THEN 1
        ELSE 2
      END
    `.as("weight");

    return await context
      .select({
        weight,
        enrollment: { id: e.id, status: e.status },
        class: { id: cls.id, classNumber: cls.classNumber },
        course: { id: c.id, name: c.name, code: c.code },
        offering: {
          id: o.id,
          weekDay: o.weekDay,
          startTimeText: o.startTimeText,
          endTimeText: o.endTimeText,
        },
        room: { name: r.name, building: r.building },
        session: {
          id: cs.id,
          startTimeMs: cs.startTimeMs,
          endTimeMs: cs.endTimeMs,
        },
        professor: {
          id: u.id,
          surname: u.surname,
          firstName: u.firstName,
          middleName: u.middleName,
        },
      })
      .from(e)
      .innerJoin(cls, eq(cls.id, e.classId))
      .innerJoin(c, eq(c.id, cls.courseId))
      .innerJoin(u, eq(u.id, cls.professorId))
      .leftJoin(cs, and(eq(cs.classId, cls.id), eq(cs.datePh, datePh)))
      .leftJoin(o, and(eq(o.id, cs.classOfferingId)))
      .leftJoin(r, eq(r.id, o.roomId))
      .where(and(eq(e.studentId, studentId), eq(cls.termId, termId)))
      .orderBy(asc(c.name), asc(weight), asc(o.startTime));
  }

  async getEnrolledIdsForClass(args: {
    classId: number;
    tx?: TxContext | undefined;
  }) {
    return await (args.tx ?? this._dbContext).query.enrollments.findMany({
      where: (e, { and, eq }) =>
        and(
          eq(e.classId, args.classId),
          eq(e.status, Core.Data.enrollmentStatus.enrolled),
        ),
      orderBy: (e, { asc }) => asc(e.id),
      columns: { id: true, status: true },
    });
  }

  async getForClassAndStudent(args: {
    values: { classId: number; studentId: number };
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { values, dbOrTx } = args;

    const { classes: c, enrollments: e, students: s } = Schema;
    const { and, eq } = RepositoryUtil.filters;

    const context = dbOrTx ?? this._dbContext;

    return await context
      .select({
        id: e.id,
        classId: c.id,
        studentId: s.id,
        status: e.status,
      })
      .from(c)
      .leftJoin(s, eq(s.id, values.studentId))
      .leftJoin(e, and(eq(e.classId, c.id), eq(e.studentId, s.id)))
      .where(eq(c.id, values.classId))
      .limit(1)
      .then((r) => r[0]);
  }

  async getByIdForProfessor(args: {
    values: { enrollmentId: number; professorId: number };
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { enrollmentId, professorId } = args.values;
    const context = args.dbOrTx ?? this._dbContext;

    const { classes: cls, enrollments: e, students: s, users: u } = Schema;
    const { and, eq } = RepositoryUtil.filters;

    return await context
      .select({
        enrollment: { id: e.id, status: e.status },
        student: {
          id: s.id,
          studentNumber: s.studentNumber,
          surname: u.surname,
          middleName: u.middleName,
          firstName: u.firstName,
        },
      })
      .from(e)
      .innerJoin(cls, eq(cls.id, e.classId))
      .innerJoin(s, eq(s.id, e.studentId))
      .innerJoin(u, eq(u.id, s.id))
      .where(and(eq(e.id, enrollmentId), eq(cls.professorId, professorId)))
      .limit(1)
      .then((r) => r[0]);
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
      columns: { id: true, status: true, classId: true },
      with: {
        student: {
          columns: {
            id: true,
            studentNumber: true,
            yearLevel: true,
            block: true,
          },
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
  async getEnrollmentStudentListView(args: {
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
