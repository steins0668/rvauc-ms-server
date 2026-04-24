import { and, eq, or, sql, SQL } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { classes, Schema } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Class extends Repository<Types.Tables.Class> {
  public constructor(context: DbContext) {
    super(context, classes);
  }

  async getProfessorClassesWithSchedule(args: {
    values: {
      professorId: number;
      termId: number;
      datePh: string;
      timeMs: number;
    };
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { professorId, termId, datePh, timeMs } = args.values;
    const context = args.dbOrTx ?? this._dbContext;

    const {
      classes: cls,
      courses: c,
      classSessions: cs,
      classOfferings: o,
      rooms: r,
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
      })
      .from(cls)
      .innerJoin(c, eq(c.id, cls.courseId))
      .leftJoin(cs, and(eq(cs.classId, cls.id), eq(cs.datePh, datePh)))
      .leftJoin(o, and(eq(o.id, cs.classOfferingId)))
      .leftJoin(r, eq(r.id, o.roomId))
      .where(and(eq(cls.professorId, professorId), eq(cls.termId, termId)))
      .orderBy(asc(c.name), asc(weight), asc(o.startTime));
  }

  public async queryWithCourse(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["classes"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["classes"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy, dbOrTx } = args;
    const { limit = 6, offset = undefined } = args.constraints ?? {};

    return await (dbOrTx ?? this._dbContext).query.classes.findMany({
      where,
      orderBy,
      limit,
      offset,
      columns: { id: true, classNumber: true, professorId: true },
      with: { course: { columns: { code: true, name: true } } },
    });
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
    filter?: Types.Repository.QueryFilters.Class,
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
    builder: BaseRepositoryType.OrderBuilder<Types.Tables.Class>,
  ) {
    return builder(classes, RepositoryUtil.orderOperators);
  }
}
