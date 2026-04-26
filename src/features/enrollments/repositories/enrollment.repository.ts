import { sql } from "drizzle-orm";
import { DbContext, DbOrTx, TxContext } from "../../../db/create-context";
import { enrollments, Schema } from "../../../models";
import { Repository } from "../../../services";
import { RepositoryUtil } from "../../../utils";
import { Core } from "../core";
import { Types } from "../types";

export class Enrollment extends Repository<Types.Tables.Enrollment> {
  public constructor(context: DbContext) {
    super(context, enrollments);
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
        course: { name: c.name, code: c.code },
        offering: {
          weekDay: o.weekDay,
          weekDayNumeric: o.weekDayNumeric,
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
}
