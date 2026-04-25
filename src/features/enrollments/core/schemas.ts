import z from "zod";

export namespace Schemas {
  export namespace Dto {
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

    export type ClassSession = z.infer<typeof classSession>;

    const runtimeBase = z
      .strictObject({
        class: z
          .strictObject({
            id: z.number(),
            classNumber: z.string(),
          })
          .strip(),
        course: z
          .strictObject({
            name: z.string(),
            code: z.string(),
          })
          .strip(),
        offering: z
          .strictObject({
            weekDay: z.string(),
            startTime: z.string(),
            endTime: z.string(),
            room: z
              .strictObject({
                name: z.string(),
                building: z.string().nullable(),
              })
              .strip()
              .nullable(),
          })
          .strip(),
        session: z
          .strictObject({
            status: z.string(),
            date: z.string(),
            runtimeStatus: z.string().nullable(),
          })
          .strip(),
      })
      .strip();

    export const runtimeProfessorView = runtimeBase;

    export const runtimeStudentView = z
      .strictObject({
        ...runtimeBase.shape,
        enrollment: z
          .strictObject({
            id: z.number(),
            status: z.string(),
          })
          .strip(),
        professor: z
          .strictObject({
            surname: z.string(),
            firstName: z.string(),
            middleName: z.string(),
          })
          .strip(),
      })
      .strip();

    export type RuntimeProfessorView = z.infer<typeof runtimeProfessorView>;
    export type RuntimeStudentView = z.infer<typeof runtimeStudentView>;
  }
}
