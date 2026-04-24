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
      export function mapStudentView(
        runtime: Awaited<
          ReturnType<
            Core.Services.ClassSessionQuery.Service["getStudentActiveClass"]
          >
        >,
      ): Core.Schemas.Dto.RuntimeStudentView {
        const {
          class: cls,
          room: r,
          session: cs,
          course: c,
          professor: p,
          offering: co,
        } = runtime;

        return {
          class: { classNumber: cls.classNumber },
          course: c,
          offering: {
            weekDay: co.weekDay,
            startTime: co.startTimeText,
            endTime: co.endTimeText,
          },
          room: r,
          session: {
            status: cs.status,
            date: cs.datePh,
          },
          professor: {
            surname: p.surname,
            firstName: p.firstName,
            middleName: p.middleName,
          },
        };
      }

      export function mapProfessorView(
        runtime: Awaited<
          ReturnType<
            Core.Services.ClassSessionQuery.Service["getProfessorActiveClass"]
          >
        >,
      ): Core.Schemas.Dto.RuntimeProfessorView {
        const {
          class: cls,
          room: r,
          session: cs,
          course: c,
          offering: co,
        } = runtime;

        return {
          class: { classNumber: cls.classNumber },
          course: c,
          offering: {
            weekDay: co.weekDay,
            startTime: co.startTimeText,
            endTime: co.endTimeText,
          },
          room: r,
          session: {
            status: cs.status,
            date: cs.datePh,
          },
        };
      }
    }
  }
}
