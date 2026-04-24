import { Core } from "../../core";
import { Repositories as CoreRepositories } from "../../repositories";
import { Schemas } from "./schemas";

export namespace DtoMappers {
  export namespace Query {
    export namespace ClassList {
      export function mapStudentView(
        rawList: Awaited<
          ReturnType<
            Core.Services.EnrollmentQuery.Service["getEnrollmentsWithSchedule"]
          >
        >,
      ): Schemas.Dto.ClassList {
        try {
          const mapped: Schemas.Dto.ClassList = {
            role: "student",
            classes: rawList.map(normalizeClassRow),
          };

          return Schemas.Dto.classList.parse(mapped);
        } catch (err) {
          throw Core.Errors.EnrollmentData.dtoConversionError({ err });
        }
      }

      export function mapProfessorView(
        rawList: Awaited<
          ReturnType<
            Core.Services.ClassQuery.Service["getProfessorClassesWithSchedule"]
          >
        >,
      ): Schemas.Dto.ClassList {
        try {
          const mapped: Schemas.Dto.ClassList = {
            role: "professor",
            classes: rawList.map(normalizeClassRow),
          };

          return Schemas.Dto.classList.parse(mapped);
        } catch (err) {
          throw Core.Errors.EnrollmentData.dtoConversionError({ err });
        }
      }

      function normalizeClassRow<T extends { offering: any; room: any }>(i: T) {
        const { offering: o, room: r } = i;

        return {
          ...i,
          offering: o
            ? {
                ...o,
                startTime: o.startTimeText,
                endTime: o.endTimeText,
                room: r,
              }
            : null,
        };
      }
    }

    export namespace ClassSessionRuntime {
      export function map(
        co: NonNullable<
          Awaited<
            ReturnType<
              CoreRepositories.ClassOffering["queryWithClassAndProfessor"]
            >
          >[0]
        >,
        cs: NonNullable<
          Awaited<
            ReturnType<CoreRepositories.ClassSession["getMinimalShape"]>
          >[0]
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
