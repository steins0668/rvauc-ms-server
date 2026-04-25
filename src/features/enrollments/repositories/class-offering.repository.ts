import { and, eq } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DbContext, TxContext } from "../../../db/create-context";
import { classOfferings, Schema } from "../../../models";
import { Repository } from "../../../services";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class ClassOffering extends Repository<Types.Tables.ClassOffering> {
  public constructor(context: DbContext) {
    super(context, classOfferings);
  }

  async getWeeklyScheduleForClass(args: {
    values: { classId: number };
    tx?: TxContext | undefined;
  }) {
    const { classId } = args.values;
    const context = args.tx ?? this._dbContext;

    const { classOfferings: co, enrollments: e } = Schema;
    const { and, eq } = RepositoryUtil.filters;
    const { asc } = RepositoryUtil.orderOperators;

    return await context
      .select({
        id: co.id,
        weekDay: co.weekDay,
        weekDayNumeric: co.weekDayNumeric,
        startTimeText: co.startTimeText,
        endTimeText: co.endTimeText,
      })
      .from(e)
      .innerJoin(co, eq(co.classId, e.classId))
      .where(eq(e.id, classId))
      .orderBy(asc(co.weekDayNumeric), asc(co.startTime));
  }

  async getMinimalShapesForWeekday(args: {
    values: { weekDay: string; termId: number };
    tx?: TxContext | undefined;
  }) {
    const { values, tx } = args;

    return await (args.tx ?? this._dbContext).query.classOfferings.findMany({
      where: (co, { and, eq, exists }) =>
        and(
          eq(co.weekDay, values.weekDay),
          exists(
            this.getClassSubquery({
              values: { classId: co.classId, termId: values.termId },
              tx,
            }),
          ),
        ),
      columns: {
        id: true,
        classId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  private getClassSubquery(args: {
    values: {
      classId: SQLiteColumn;
      termId: number;
      professorId?: number | undefined;
    };
    tx?: TxContext | undefined;
  }) {
    const { classId, termId, professorId } = args.values;
    const { classes: c } = Schema;

    const context = args.tx ?? this._dbContext;
    const conditions = [eq(c.id, classId), eq(c.termId, termId)];

    //  ! used when querying class offerings for professors
    if (professorId !== undefined)
      conditions.push(eq(c.professorId, professorId));

    return context
      .select({ id: c.id })
      .from(c)
      .where(and(...conditions));
  }
}
