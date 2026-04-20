import "dotenv/config";
import z from "zod";

export namespace Data {
  export const classSessionStatus = {
    scheduled: "scheduled",
    cancelled: "cancelled",
  } as const;

  export const enrollmentStatus = {
    enrolled: "enrolled",
  } as const;

  export namespace Env {
    export function getAcademicYearConfig() {
      const config = {
        yearStart: process.env.ACADEMIC_YEAR_START,
        yearEnd: process.env.ACADEMIC_YEAR_END,
        semester: process.env.ACADEMIC_YEAR_SEMESTER,
        semesterStart: process.env.ACADEMIC_YEAR_SEMESTER_START_DATE,
        semesterEnd: process.env.ACADEMIC_YEAR_SEMESTER_END_DATE,
      };

      const schema = z
        .strictObject({
          yearStart: z.coerce.number(),
          yearEnd: z.coerce.number(),
          semester: z.coerce.number(),
          semesterStart: z.coerce.date(),
          semesterEnd: z.coerce.date(),
        })
        .strip();

      const parsed = schema.parse(config);

      return parsed;
    }
  }
}
