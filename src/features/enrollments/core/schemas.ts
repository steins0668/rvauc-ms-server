import z from "zod";

export namespace Schemas {
  export namespace Dto {
    export const activeClass = z
      .strictObject({
        classId: z.number(),
        //  * class metadata
        id: z.number(),
        weekDay: z.string(),
        startTimeText: z.string(),
        endTimeText: z.string(),
        startTime: z.number(),
        endTime: z.number(),
        classNumber: z.coerce.string(), //  ! coerced incase column type changes
        //  * course metadata
        courseCode: z.coerce.string(), //  ! coerced incase column type changes
        courseName: z.string(),
        //  * professor metadata
        professor: z.object({
          surname: z.string(),
          firstName: z.string(),
          middleName: z.string().nullish(),
        }),
      })
      .strip();

    export type ActiveClass = z.infer<typeof activeClass>;
  }
}
