import z from "zod";

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

    export const course = z
      .strictObject({
        code: z.coerce.string(), //  ! coerced incase column type changes
        name: z.string(),
      })
      .strip();

    export const classOfferingDetails = z
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

    export const scheduledClass = z
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
        ...scheduledClass.shape,
        enrollments: z.array(
          z.object({
            id: z.number(),
            studentId: z.number(),
            status: z.string(),
          }),
        ),
      })
      .strip();

    export type Class_ = z.infer<typeof class_>;
    export type Course = z.infer<typeof course>;
    export type ClassOfferingDetails = z.infer<typeof classOfferingDetails>;
    export type Enrollments = z.infer<typeof enrollments>;
    export type Professor = z.infer<typeof professor>;
  }
}
