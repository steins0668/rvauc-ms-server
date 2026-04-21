import { TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Schemas } from "../schemas";
import { Services } from "../services";

export namespace Mutation {
  export function sessionAttendanceResult(
    classRuntime: Awaited<
      ReturnType<Core.Services.ClassRuntimeResolver.Service["resolve"]>
    >,
    attendance: NonNullable<
      Awaited<
        ReturnType<
          Services.AttendanceCommand.Service["persistSessionAttendance"]
        >
      >
    >,
  ): Schemas.Dto.ClassAttendance.SessionAttendanceResult {
    const { offering: co, session: cs } = classRuntime;
    const { class: cls, rooms: r } = co;
    const { course: crs, professor: p } = cls;

    return {
      class: {
        id: cls.id,
        classNumber: cls.classNumber,
        course: crs,
        offering: {
          id: co.id,
          weekDay: co.weekDay,
          room: r?.name ?? "N/A",
          startTimeText: co.startTimeText,
          endTimeText: co.endTimeText,
          startTime: co.startTime,
          endTime: co.endTime,
        },
        professor: {
          surname: p.user.surname,
          firstName: p.user.firstName,
          middleName: p.user.middleName,
          gender: p.user.gender,
          college: p.college.name,
          facultyRank: p.facultyRank,
        },
        session: {
          id: cs.id,
          classOfferingId: cs.classOfferingId,
          status: cs.status,
          datePh: cs.datePh,
          startTimeMs: cs.startTimeMs,
          endTimeMs: cs.endTimeMs,
        },
      },
      attendance: {
        id: attendance.id,
        status: attendance.status,
        date: attendance.datePh,
        time: TimeUtil.toPhTime(new Date(attendance.recordedAt)),
        isNew: attendance.recordCount === 1,
      },
    };
  }

  export function sessionRecordsMutationResult(
    updated: Awaited<
      ReturnType<
        Services.AttendanceCommand.Service["upsertStatusAndRecordDateTime"]
      >
    >,
    inserted: Awaited<
      ReturnType<
        Services.AttendanceCommand.Service["upsertStatusAndRecordDateTime"]
      >
    >,
    rejected: Schemas.Dto.ClassAttendance.NormalizedRecords,
  ): Schemas.Dto.ClassAttendance.MutationResult {
    const updatedDto = updated.map((r) => {
      return {
        id: r.id,
        status: r.status,
        date: r.datePh,
        time: TimeUtil.toPhTime(new Date(r.recordedAt)),
        isNew: r.recordCount === 1,
      };
    });

    const insertedDto = inserted.map((r) => {
      return {
        id: r.id,
        status: r.status,
        date: r.datePh,
        time: TimeUtil.toPhTime(new Date(r.recordedAt)),
        isNew: r.recordCount === 1,
      };
    });

    return { updated: updatedDto, inserted: insertedDto, rejected };
  }
}
