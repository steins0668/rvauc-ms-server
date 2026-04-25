import { sql } from "drizzle-orm";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { classes, Schema } from "../../../models";
import { Repository } from "../../../services";
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
}
