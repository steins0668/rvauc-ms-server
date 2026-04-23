import { Repositories } from "../repositories";
import { Schemas } from "./schemas";

export namespace DtoMappers {
  export namespace Query {
    export namespace ClassSchedule {
      export function map(
        co: NonNullable<
          Awaited<
            ReturnType<Repositories.ClassOffering["queryWithClassAndProfessor"]>
          >[0]
        >,
      ): Schemas.Dto.ScheduledClassWithProfessor {
        const { class: cls, rooms: r } = co;
        const { course: c, professor: p } = co.class;

        const room = r ? r.building + r.name : "N/A";

        return {
          id: cls.id,
          classNumber: cls.classNumber,
          course: c,
          offering: {
            id: co.id,
            weekDay: co.weekDay,
            room,
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
        };
      }
    }

    export namespace ClassSessionRuntime {
      export function map(
        co: NonNullable<
          Awaited<
            ReturnType<Repositories.ClassOffering["queryWithClassAndProfessor"]>
          >[0]
        >,
        cs: NonNullable<
          Awaited<ReturnType<Repositories.ClassSession["getMinimalShape"]>>[0]
        >,
      ): Schemas.Dto.ScheduledSessionWithProfessor {
        const { class: cls, rooms: r } = co;
        const { course: crs, professor: p } = co.class;

        return {
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
        };
      }
    }
  }
}
