import { createContext, DbOrTx } from "../../../../../db/create-context";
import { Enums } from "../../../../../data";
import { Schema } from "../../../../../models";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";

export namespace AttendanceData {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    return new Service({
      attendanceRecordRepo,
      classOfferingRepo,
    });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classOfferingRepo: CoreRepositories.ClassOffering;

    constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classOfferingRepo: CoreRepositories.ClassOffering;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classOfferingRepo = args.classOfferingRepo;
    }

    async getAttendance(args: QueryArgs & { queryContext: QueryContext }) {
      const { queryContext } = args;

      switch (queryContext.role) {
        case "student": {
          const { values } = queryContext;
          return await this.getStudentAttendance({
            ...args,
            classId: values.classId,
            studentId: values.studentId,
          });
        }
        case "professor": {
          return await this.getClassAttendance({ ...args, queryContext });
        }
        default:
          throw new Auth.Core.Errors.Authentication.ErrorClass({
            name: "AUTHENTICATION_FORBIDDEN_ROLE_ERROR",
            message: `Role not supported.`,
          });
      }
    }

    async getStudentAttendance(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      classId: number;
      studentId: number;
    }) {
      let queried;

      try {
        queried = await this.queryStudentAttendance(args);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed getting attendance records for student.",
            err,
          }),
        );
      }

      try {
        const dtoList = queried.map((raw) => this.toStudentAttendanceDto(raw));
        return ResultBuilder.success({ attendanceRecord: dtoList });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          }),
        );
      }
    }

    async getClassAttendance(
      args: QueryArgs & { queryContext: ClassAttendanceQueryContext },
    ) {
      let queried;
      try {
        queried = await this.queryClassAttendance(args);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed getting attendance records for class.",
            err,
          }),
        );
      }

      try {
        const dtoList = this.toClassAttendanceRecordDto(queried);
        return ResultBuilder.success(dtoList);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          }),
        );
      }
    }

    private toStudentAttendanceDto(
      raw: Awaited<ReturnType<typeof this.queryStudentAttendance>>[number],
    ) {
      const dto = {
        id: raw.id,
        status: raw.status,
        date: raw.datePh,
        time: TimeUtil.toPhTime(new Date(raw.recordedAt)),
      };

      return Schemas.Dto.studentAttendance.parse(dto);
    }

    /**
     * @description orchestrates queries to retrieve data for the attendance record linked to a classId and studentId
     */
    private async queryStudentAttendance(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      classId: number;
      studentId: number;
    }) {
      const { dbOrTx, constraints, classId, studentId } = args;

      const { limit = 6, page = 1 } = constraints ?? {};

      const { and, eq } = RepositoryUtil.filters;

      return this._attendanceRecordRepo.execQuery({
        dbOrTx,
        fn: (query) =>
          query.findMany({
            where: (ar) =>
              and(eq(ar.studentId, studentId), eq(ar.classId, classId)),
            columns: {
              classId: false,
              studentId: false,
              recordCount: false,
            },
            orderBy: (ar, { desc }) => desc(ar.recordedMs), //  ! sort by latest
            limit,
            offset: (page - 1) * limit,
          }),
      });
    }

    /**
     * @description transforms the data retrieved by `queryClassAttendance` into a dto. Normalizes missing
     * attendance records by setting "absent" as the default value for the "status" field and "N/A" for the others.
     */
    private toClassAttendanceRecordDto(
      raw: Awaited<ReturnType<typeof this.queryClassAttendance>>,
    ): Schemas.Dto.ClassAttendanceRecord {
      const { classOffering, enrollments, attendanceRecords } = raw;
      const { professor, course, ...classMetadata } = classOffering.class;

      const attendanceMap = new Map<
        number,
        (typeof attendanceRecords)[number]
      >();

      for (const ar of attendanceRecords) attendanceMap.set(ar.studentId, ar);

      const attendanceRecord = enrollments.map((e) => {
        const { student } = e;

        const studentAttendance = attendanceMap.get(student.id);

        const status =
          studentAttendance?.status ?? Data.attendanceStatus.absent;
        const date = studentAttendance?.datePh ?? "N/A";
        const time = studentAttendance?.recordedAt
          ? TimeUtil.toPhTime(new Date(studentAttendance.recordedAt))
          : "N/A";

        return {
          student: { ...student },
          attendance: {
            id: studentAttendance?.id ?? 0,
            status,
            date,
            time,
          },
        } as Schemas.Dto.StudentAttendanceDetailed;
      });

      const dto: Schemas.Dto.ClassAttendanceRecord = {
        attendanceRecord,
        scheduledClass: {
          room: classOffering.rooms?.name ?? "N/A",
          ...classOffering,
          classId: classMetadata.id,
          classNumber: classMetadata.classNumber,
          courseCode: course.code,
          courseName: course.name,
          professor: { ...professor.user },
        },
      };

      return Schemas.Dto.classAttendanceRecord.parse(dto);
    }

    /**
     * @description orchestrates queries across multiple tables to retrieve data including: the current class
     * offering matching the set date and time and classId, the enrollments(and student) linked to the class offering,
     * as well as the attendance records linked to each enrollment.
     */
    private async queryClassAttendance(
      args: QueryArgs & { queryContext: ClassAttendanceQueryContext },
    ) {
      const { classId, date } = args.queryContext.values;

      //  * get the class along with enrollments
      const classOffering = await this.queryClassOffering({
        values: { classId, date },
        dbOrTx: args.dbOrTx,
      });

      let attendanceRecords: Awaited<
        ReturnType<typeof this.queryAttendanceRecords>
      > = [];

      if (!classOffering)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
          message:
            "Provided class has no existing schedule at the provided date.",
        });

      const enrollments = await this.queryEnrollments({
        values: { classOfferingId: classOffering.id },
        ...args,
      });

      if (enrollments.length) {
        const studentIds = enrollments.map((e) => e.student.id);

        const { startTime, endTime } = classOffering;
        const timeRange = TimeUtil.getPhTimeRange(
          date,
          startTime - 30 * 60,
          endTime,
        );

        //  * get attendance records matching the schedule of the class
        attendanceRecords = await this.queryAttendanceRecords({
          values: { classId, timeRange, studentIds },
          dbOrTx: args.dbOrTx,
        });
      }

      return { classOffering, enrollments, attendanceRecords };
    }

    /**
     * @description helper for `queryClassAttendance`. Queries the class offering schedule linked to the class
     * id that best matches the current date and time.
     * ! ALERT: current system design does not allow for cross-day schedules (e.g. 11:00 PM - 1:00 AM)
     */
    private async queryClassOffering(args: {
      values: { classId: number; date: Date };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { classId, date } = args.values;
      const day = Enums.Days[date.getDay()] as string;
      const weekDay = day.substring(0, 3);
      const seconds = TimeUtil.secondsSinceMidnightPh(date);

      return await this._classOfferingRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: (query) =>
          query.findFirst({
            where: (co, { and, eq, lte }) =>
              and(
                eq(co.classId, classId),
                eq(co.weekDay, weekDay),
                lte(co.startTime, seconds),
              ),
            orderBy: (co, { desc }) => desc(co.startTime),
            columns: { classId: false },
            with: {
              class: {
                columns: { id: true, classNumber: true },
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
              rooms: { columns: { name: true } },
            },
          }),
      });
    }

    /**
     * @description helper for `queryClassAttendance`. Queries enrollments linked to a class offering.
     * Paginated.
     */
    private async queryEnrollments(
      args: QueryArgs & {
        values: { classOfferingId: number };
      },
    ) {
      const { dbOrTx = await createContext() } = args;
      const { limit = 6, page = 1 } = args.constraints ?? {};

      const { enrollments, students, users } = Schema;
      const { eq } = RepositoryUtil.filters;
      const { asc } = RepositoryUtil.orderOperators;

      return await dbOrTx
        .select({
          student: {
            id: students.id,
            studentNumber: students.studentNumber,
            yearLevel: students.yearLevel,
            block: students.block,
            gender: users.gender,
            surname: users.surname,
            firstName: users.firstName,
            middleName: users.middleName,
          },
        })
        .from(enrollments)
        .innerJoin(students, eq(enrollments.studentId, students.id))
        .innerJoin(users, eq(students.id, users.id))
        .where(eq(enrollments.classOfferingId, args.values.classOfferingId))
        .orderBy(
          asc(users.surname),
          asc(users.firstName),
          asc(users.middleName),
          asc(users.id),
        )
        .limit(limit)
        .offset((page - 1) * limit);
    }

    /**
     * @description helper for `queryClassAttendance`. Queries attendance records matching a class id, time range, and
     * a set of student ids
     */
    private async queryAttendanceRecords(args: {
      values: {
        classId: number;
        timeRange: { startTimeMs: number; endTimeMs: number };
        studentIds: number[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { dbOrTx = await createContext() } = args;
      const { classId, timeRange, studentIds } = args.values;

      const { attendanceRecords: ar } = Schema;
      const { inArray, and, eq, gte, lte } = RepositoryUtil.filters;
      const { desc } = RepositoryUtil.orderOperators;

      const { id, studentId, status, recordedAt, datePh } = ar;

      await dbOrTx
        .select({ id, studentId, status, recordedAt, datePh })
        .from(ar)
        .where(
          and(
            inArray(ar.studentId, studentIds),
            eq(ar.classId, classId),
            and(
              gte(ar.recordedMs, timeRange.startTimeMs),
              lte(ar.recordedMs, timeRange.endTimeMs),
            ),
          ),
        )
        .orderBy(desc(ar.recordedMs));

      return await this._attendanceRecordRepo.execQuery({
        dbOrTx: args.dbOrTx,
        fn: (query) =>
          query.findMany({
            where: (ar, { inArray, and, eq, gte, lte }) =>
              and(
                inArray(ar.studentId, studentIds),
                eq(ar.classId, classId),
                and(
                  gte(ar.recordedMs, timeRange.startTimeMs),
                  lte(ar.recordedMs, timeRange.endTimeMs),
                ),
              ),
            orderBy: (ar, { desc }) => desc(ar.recordedMs),
            columns: { classId: false, recordCount: false, recordedMs: false },
          }),
      });
    }
  }

  const { roles } = Auth.Core.Data.Records;
  type RolesRecord = typeof roles;
  type Role = keyof typeof roles;

  type StudentAttendanceQueryContext = {
    role: RolesRecord["student"];
    values: { termId: number; classId: number; studentId: number };
  };

  type ClassAttendanceQueryContext = {
    role: RolesRecord["professor"];
    scope: "class";
    values: {
      termId: number;
      professorId: number;
      classId: number;
      date: Date;
    };
  };

  type QueryContext = {
    role: Role;
  } & (StudentAttendanceQueryContext | ClassAttendanceQueryContext);

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints>;
    dbOrTx?: DbOrTx | undefined;
  };
}
