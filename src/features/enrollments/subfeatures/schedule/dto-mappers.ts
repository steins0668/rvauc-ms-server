import { Core } from "../../core";
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
  }
}
