import { Enums } from "../../../../data";
import { createContext, TxContext } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Data } from "../data";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

export namespace EnrollmentData {
  export async function createService() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const enrollmentRepo = new Repositories.Enrollment(context);
    const termRepo = new Repositories.Term(context);
    return new Service({ classOfferingRepo, enrollmentRepo, termRepo });
  }

  export class Service {
    private readonly _enrollmentRepo: Repositories.Enrollment;
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _termRepo: Repositories.Term;

    public constructor(args: {
      classOfferingRepo: Repositories.ClassOffering;
      enrollmentRepo: Repositories.Enrollment;
      termRepo: Repositories.Term;
    }) {
      this._classOfferingRepo = args.classOfferingRepo;
      this._enrollmentRepo = args.enrollmentRepo;
      this._termRepo = args.termRepo;
    }

    public async getActiveEnrollment(args: {
      tx?: TxContext | undefined;
      date: Date;
      termId: number;
      studentId: number;
    }) {
      let result;
      try {
        result = await this.queryActiveEnrollment(args);
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          })
        );
      }

      if (!result)
        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
            message:
              "This student has neither an ongoing class or a class that starts in 30 minutes.",
          })
        );

      return this.toEnrollmentDto(result);
    }

    private async queryActiveEnrollment(args: {
      tx?: TxContext | undefined;
      date: Date;
      termId: number;
      studentId: number;
    }) {
      const { tx, date, termId, studentId } = args;
      const day = Enums.Days[date.getDay()] as string;
      const weekDay = day.substring(0, 3);
      const seconds = TimeUtil.secondsSinceMidnightPh(date);

      //  ! for allowing attendance 30 minutes before class
      const offsetDate = new Date(date);
      offsetDate.setMinutes(offsetDate.getMinutes() + 30);
      const offsetSeconds = TimeUtil.secondsSinceMidnightPh(offsetDate);

      return await this._classOfferingRepo.execQuery({
        dbOrTx: tx,
        fn: async (query) =>
          query.findFirst({
            where: (co, { eq, and, or, lte, gt, exists }) => {
              const subQuery = this._enrollmentRepo.getContext({
                dbOrTx: tx,
                fn: ({ table: e, context, converter }) =>
                  context
                    .select({ id: e.id })
                    .from(e)
                    .where(
                      converter({
                        custom: (e, { eq, and }) => [
                          and(
                            eq(e.classOfferingId, co.id),
                            eq(e.studentId, studentId),
                            eq(e.termId, termId)
                          ),
                        ],
                      })
                    ),
              });

              return and(
                eq(co.weekDay, weekDay),
                or(
                  //  ! class currently in session
                  and(lte(co.startTime, seconds), gt(co.endTime, seconds)),
                  //  ! class starts in 30 minutes
                  and(
                    gt(co.startTime, seconds),
                    lte(co.startTime, offsetSeconds)
                  )
                ),
                exists(subQuery)
              );
            },
            columns: { classId: false },
            with: {
              enrollment: {
                columns: { id: true, status: true },
              },
              class: {
                columns: {},
                with: {
                  course: { columns: { code: true, name: true } },
                  professor: {
                    columns: {},
                    with: {
                      user: {
                        columns: {
                          firstName: true,
                          middleName: true,
                          surname: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
      });
    }

    private toEnrollmentDto(
      raw: NonNullable<Awaited<ReturnType<typeof this.queryActiveEnrollment>>>
    ) {
      const { course, professor } = raw.class;

      const dto: Schemas.Dto.EnrollmentDTO = {
        id: raw.id,
        weekDay: raw.weekDay,
        startTimeText: raw.startTimeText,
        endTimeText: raw.endTimeText,
        startTime: raw.startTime,
        endTime: raw.endTime,
        classNumber: raw.classNumber,
        courseCode: course.code,
        courseName: course.name,
        professor: professor.user,
      };

      const parsed = Schemas.Dto.enrollmentDTO.safeParse(dto);

      return parsed.success
        ? ResultBuilder.success(parsed.data)
        : ResultBuilder.fail(
            Errors.EnrollmentData.normalizeError({
              name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
              message: "Failed converting raw query data into enrollment DTO",
              err: parsed.error,
            })
          );
    }

    public async getCurrentTerm(args?: { tx?: TxContext | undefined }) {
      const { yearStart, yearEnd, semester } = Data.Env.getAcademicYearConfig();

      try {
        const inserted = await this._termRepo.execInsert({
          dbOrTx: args?.tx,
          fn: async ({ table: t, insert }) =>
            insert
              .values({
                yearStart,
                yearEnd,
                semester,
              })
              .onConflictDoUpdate({
                target: [t.yearStart, t.yearEnd, t.semester],
                set: { yearEnd },
              })
              .returning()
              .then((result) => result[0]),
        });

        if (!inserted) throw Error("The returning value is undefined");

        return ResultBuilder.success(inserted);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_INSERT_ERROR",
            message: "Failed inserting in `terms` table.",
            err,
          })
        );
      }
    }
  }
}
