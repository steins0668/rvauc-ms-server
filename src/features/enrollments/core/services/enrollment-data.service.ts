import { Enums } from "../../../../data";
import { createContext, TxContext } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Data } from "../data";
import { Errors } from "../errors";

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
      const { tx, date, termId, studentId } = args;
      const day = Enums.Days[date.getDay()] as string;
      const seconds = TimeUtil.secondsSinceMidnightPh(date);

      //  ! for allowing attendance 30 minutes before class
      const offsetDate = new Date(date);
      offsetDate.setMinutes(offsetDate.getMinutes() + 30);
      const offsetSeconds = TimeUtil.secondsSinceMidnightPh(offsetDate);

      const queried = await this.queryEnrollments({
        dbOrTx: tx,
        fn: async (query, converter) =>
          query.findFirst({
            where: converter({
              filterType: "and",
              studentId,
              termId,
              custom: ({ classOfferingId }, { eq, exists }) => {
                //  * subquery for matching timestamp classes
                const subQuery = this._classOfferingRepo.getSubQuery({
                  dbOrTx: tx,
                  fn: ({ selectBase, converter, order }) =>
                    selectBase
                      .where(
                        converter({
                          filterType: "and",
                          weekDay: day,
                          custom: (t, { and, or, lte, gt }) => [
                            eq(t.id, classOfferingId),
                            or(
                              //  ! class currently in session
                              and(
                                lte(t.startTime, seconds),
                                gt(t.endTime, seconds)
                              ),
                              //  ! class starts in 30 minutes
                              and(
                                gt(t.startTime, seconds),
                                lte(t.startTime, offsetSeconds)
                              )
                            ),
                          ],
                        })
                      )
                      .orderBy(order((t, { asc }) => asc(t.startTime)))
                      .limit(1)
                      .as("class_sq"),
                });
                return [exists(subQuery)];
              },
            }),
            columns: { classOfferingId: false },
            with: {
              classOffering: {
                columns: { classId: false },
                with: {
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
              },
            },
          }),
      });

      if (queried.success) {
        const { result } = queried;

        if (result) return ResultBuilder.success(result);

        return ResultBuilder.fail(
          new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
            message: "No active class found for student.",
          })
        );
      }

      return ResultBuilder.fail(
        Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ENROLLMENT_ERROR",
          message: "Failed querying enrollments",
          err: queried.error,
        })
      );
    }

    public async queryEnrollments<T>(
      args: Types.Repository.QueryArgs.Enrollment<T>
    ) {
      try {
        const queried = await this._enrollmentRepo.execQuery(args);
        return ResultBuilder.success(queried);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Failed querying `enrollments` table.",
            err,
          })
        );
      }
    }

    public async getCurrentTerm(args?: { tx?: TxContext | undefined }) {
      const { yearStart, yearEnd, semester } = Data.Env.getAcademicYearConfig();

      try {
        const inserted = await this._termRepo.execInsert({
          dbOrTx: args?.tx,
          fn: async (insert, converter) =>
            insert
              .values({
                yearStart,
                yearEnd,
                semester,
              })
              .onConflictDoNothing()
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
