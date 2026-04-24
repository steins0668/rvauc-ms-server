import { TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Schemas } from "../schemas";
import { Services } from "../services";

export namespace Mutation {
  export function sessionAttendanceResult(
    runtime: Awaited<
      ReturnType<
        Core.Services.ClassSessionQuery.Service["getStudentActiveClass"]
      >
    > & { room: { name: string; building: string | null } },
    attendance: NonNullable<
      Awaited<
        ReturnType<
          Services.AttendanceCommand.Service["persistSessionAttendance"]
        >
      >
    >,
  ): Schemas.Dto.ClassAttendance.SessionAttendanceResult {
    const { offering: co, session: cs } = runtime;
    const { class: cls, room: r } = runtime;
    const { course: crs, professor: p } = runtime;

    return {
      class: { classNumber: cls.classNumber },
      course: crs,
      offering: {
        weekDay: co.weekDay,
        startTime: co.startTimeText,
        endTime: co.endTimeText,
      },
      room: { name: r.name, building: r.building },
      session: { status: cs.status, date: cs.datePh },
      professor: {
        surname: p.surname,
        firstName: p.firstName,
        middleName: p.middleName,
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
    rejected: Schemas.Dto.ClassAttendance.RejectedRecords,
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
