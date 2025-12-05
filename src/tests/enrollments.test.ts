import { Enums } from "../data";
import { createContext, TxContext } from "../db/create-context";
import { Enrollments } from "../features/enrollments";
import { FakeClock, TimeUtil } from "../utils";

const testActiveEnrollment = async (args: {
  tx?: TxContext | undefined;
  date: Date;
  termId: number;
  studentId: number;
}) => {
  const context = await createContext();
  const classOfferingRepo = new Enrollments.Repositories.ClassOffering(context);
  const enrollmentRepo = new Enrollments.Repositories.Enrollment(context);

  const { tx, date, termId, studentId } = args;
  const day = Enums.Days[date.getDay()] as string;
  const weekDay = day.substring(0, 3);
  const seconds = TimeUtil.secondsSinceMidnightPh(date);

  //  ! for allowing attendance 30 minutes before class
  const offsetDate = new Date(date);
  offsetDate.setMinutes(offsetDate.getMinutes() + 30);
  const offsetSeconds = TimeUtil.secondsSinceMidnightPh(offsetDate);

  console.log(
    JSON.stringify({
      weekDay,
      seconds,
      offsetSeconds,
    })
  );

  const result = await classOfferingRepo.execQuery({
    dbOrTx: tx,
    fn: async (query) =>
      query.findFirst({
        where: (co, { eq, and, or, lte, gt, exists }) => {
          const subQuery = enrollmentRepo.getContext({
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
              and(gt(co.startTime, seconds), lte(co.startTime, offsetSeconds))
            ),
            exists(subQuery)
          );
        },
        columns: { classId: false },
        with: {
          enrollment: {
            columns: {
              classOfferingId: false,
              studentId: false,
              termId: false,
            },
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

  console.log(JSON.stringify(result));
};

testActiveEnrollment({ date: FakeClock.now(), studentId: 7, termId: 1 });
