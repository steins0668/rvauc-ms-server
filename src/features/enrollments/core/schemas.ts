import z from "zod";
import { Data } from "./data";

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
        status: z.enum(Data.classSessionStatus),
        date: z.string(),
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

    export type ScheduledClass = z.infer<typeof scheduledClass>;

    export const scheduledClassWithProfessor = z
      .strictObject({
        ...scheduledClass.shape,
        professor: professor,
      })
      .strip();

    export type ScheduledClassWithProfessor = z.infer<
      typeof scheduledClassWithProfessor
    >;

    export const classEndDetection = z
      .strictObject({
        class: scheduledClassWithProfessor,
        enrollments: z.array(enrollmentMinimal),
      })
      .strip();

    export type ClassEndDetection = z.infer<typeof classEndDetection>;
  }
}
