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

    export const enrollmentMinimal = z
      .strictObject({
        id: z.number(),
        studentId: z.number(),
        status: z.string(),
      })
      .strip();

    export type Class_ = z.infer<typeof class_>;
    export type ClassOffering = z.infer<typeof classOffering>;
    export type ClassSession = z.infer<typeof classSession>;
    export type Course = z.infer<typeof course>;
    export type EnrollmentMinimal = z.infer<typeof enrollmentMinimal>;
    export type Professor = z.infer<typeof professor>;
    export type Student = z.infer<typeof student>;

    export const scheduledClass = z
      .strictObject({
        ...class_.shape,
        course: course,
        offering: classOffering,
      })
      .strip();
    export const scheduledClasses = z.array(scheduledClass);
    export const scheduledClassWithProfessor = z
      .strictObject({
        ...scheduledClass.shape,
        professor: professor,
      })
      .strip();
    export const scheduledClassesWithProfessor = z.array(
      scheduledClassWithProfessor,
    );
    export const scheduledSessionWithProfessor = z
      .strictObject({
        ...scheduledClassWithProfessor.shape,
        session: classSession,
      })
      .strip();

    export const classList = z.array(
      z
        .strictObject({
          class: z
            .strictObject({ id: z.number(), classNumber: z.string() })
            .strip(),
          course: z
            .strictObject({
              id: z.number(),
              name: z.string(),
              code: z.string(),
            })
            .strip(),
          offering: z.nullable(
            z
              .strictObject({
                id: z.number(),
                weekDay: z.string(),
                startTime: z.string(),
                endTime: z.string(),
                room: z.nullable(
                  z
                    .strictObject({
                      name: z.string(),
                      building: z.string().nullable(),
                    })
                    .strip(),
                ),
              })
              .strip(),
          ),
          professor: z
            .strictObject({
              id: z.number(),
              surname: z.string(),
              firstName: z.string(),
              middleName: z.string(),
            })
            .strip(),
        })
        .strip(),
    );

    export type ScheduledClass = z.infer<typeof scheduledClass>;
    export type ScheduledClasses = z.infer<typeof scheduledClasses>;
    export type ScheduledClassWithProfessor = z.infer<
      typeof scheduledClassWithProfessor
    >;
    export type ScheduledClassesWithProfessor = z.infer<
      typeof scheduledClassesWithProfessor
    >;
    export type ScheduledSessionWithProfessor = z.infer<
      typeof scheduledSessionWithProfessor
    >;
    export type ClassList = z.infer<typeof classList>;
  }
}
