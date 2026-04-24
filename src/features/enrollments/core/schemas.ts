import z from "zod";
import { Auth } from "../../auth";

export namespace Schemas {
  export namespace Dto {
    export const professor = z
      .strictObject({
        //  * professor data
        college: z.string(),
        facultyRank: z.string(),
        //  * user data
        surname: z.string(),
        firstName: z.string(),
        middleName: z.string(),
        gender: z.string(),
      })
      .strip();

    export const student = z
      .strictObject({
        //  * student data
        studentNumber: z.string(),
        department: z.string(),
        yearLevel: z.number(),
        block: z.string(),
        //  * user data
        surname: z.string(),
        firstName: z.string(),
        middleName: z.string(),
        gender: z.string(),
      })
      .strip();

    export const class_ = z
      .strictObject({
        id: z.number(),
        classNumber: z.coerce.string(), //  ! coerced incase column type changes
      })
      .strip();

    export const classOffering = z
      .strictObject({
        id: z.number(),
        weekDay: z.string(),
        room: z.preprocess((r) => r ?? undefined, z.string().default("N/A")),
        startTimeText: z.string(),
        endTimeText: z.string(),
        startTime: z.number(),
        endTime: z.number(),
      })
      .strip();

    export const classSession = z
      .strictObject({
        id: z.number(),
        classOfferingId: z.number(),
        status: z.string(),
        datePh: z.string(),
        startTimeMs: z.number(),
        endTimeMs: z.number(),
      })
      .strip();

    export const course = z
      .strictObject({
        code: z.coerce.string(), //  ! coerced incase column type changes
        name: z.string(),
      })
      .strip();

    export type ClassSession = z.infer<typeof classSession>;
  }
}
