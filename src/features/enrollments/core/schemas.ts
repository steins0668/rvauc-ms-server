import z from "zod";

export namespace Schemas {
  export namespace Dto {
    export const enrollmentDTO = z
      .strictObject({
        id: z.number(),
        //  * class metadata
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

    export type EnrollmentDTO = z.infer<typeof enrollmentDTO>;
  }
}
