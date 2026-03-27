import z from "zod";

export namespace Schemas {
  export namespace Dto {
    export const activeClass = z
      .strictObject({
        //  * class offering metadata
        id: z.number(),
        weekDay: z.string(),
        room: z.preprocess((r) => r ?? undefined, z.string().default("N/A")),
        startTimeText: z.string(),
        endTimeText: z.string(),
        startTime: z.number(),
        endTime: z.number(),
        //  * class metadata
        classId: z.number(),
        classNumber: z.coerce.string(), //  ! coerced incase column type changes
        //  * course metadata
        courseCode: z.coerce.string(), //  ! coerced incase column type changes
        courseName: z.string(),
        //  * professor metadata
        professor: z.object({
          surname: z.string(),
          firstName: z.string(),
          middleName: z.string(),
        }),
      })
      .strip();

    export const enrollments = z
      .strictObject({
        ...activeClass.shape,
        enrollments: z.array(
          z.object({
            id: z.number(),
            studentId: z.number(),
            status: z.string(),
          }),
        ),
      })
      .strip();

    export type ActiveClass = z.infer<typeof activeClass>;
    export type Enrollments = z.infer<typeof enrollments>;
  }
}
