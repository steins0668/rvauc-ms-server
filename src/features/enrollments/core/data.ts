import "dotenv/config";
import z from "zod";

export namespace Data {
  export const enrollmentStatus = {
    enrolled: "enrolled",
  } as const;

  export namespace Env {
    export function getAcademicYearConfig() {
      const config = {
        yearStart: process.env.ACADEMIC_YEAR_START,
        yearEnd: process.env.ACADEMIC_YEAR_END,
        semester: process.env.ACADEMIC_YEAR_SEMESTER,
      };

      const schema = z
        .strictObject({
          yearStart: z.coerce.number(),
          yearEnd: z.coerce.number(),
          semester: z.coerce.number(),
        })
        .strip();

      const parsed = schema.parse(config);

      return parsed;
    }
  }
}
