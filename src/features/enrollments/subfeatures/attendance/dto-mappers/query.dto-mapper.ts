import { TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Data } from "../data";
import { Schemas } from "../schemas";
import { Services } from "../services";

export namespace Query {
  export function classAttendanceProfessorView(
    session: NonNullable<
      Awaited<
        ReturnType<
          Core.Services.ClassSessionQuery.Service["ensureWithClassContext"]
        >
      >
    >,
    classEnrollments: Awaited<
      ReturnType<
        Core.Services.EnrollmentQuery.Service["getEnrollmentsWithStudentDetails"]
      >
    >,
    recordsAndSummary: Awaited<
      ReturnType<Services.AttendanceQuery.Service["fetchRecordsAndSummary"]>
    >,
  ): Schemas.Dto.ClassAttendance.ProfessorView {
    const { classOffering: offering } = session;
    const { course, ...cls } = session.class;
    const { enrollments, totalEnrollments } = classEnrollments;
    const { records, summary } = recordsAndSummary;

    const attendanceMap = new Map<number, (typeof records)[number]>();

    for (const r of records) attendanceMap.set(r.enrollmentId, r);

    return {
      attendanceRecords: enrollments.map((e) => {
        const { student } = e;

        const enrollmentAttendance = attendanceMap.get(e.id);

        const status =
          enrollmentAttendance?.status ?? Data.attendanceStatus.absent;
        const date = enrollmentAttendance?.datePh ?? "N/A";
        const time = enrollmentAttendance?.recordedAt
          ? TimeUtil.toPhTime(new Date(enrollmentAttendance.recordedAt))
          : "N/A";

        return {
          enrollment: { id: e.id, status: e.status },
          student: {
            ...student,
            department: student.department ?? "No department.",
          },
          record: {
            id: enrollmentAttendance?.id ?? 0,
            status,
            date,
            time,
          },
        };
      }),
      offering: {
        id: offering.id,
        weekDay: offering.weekDay,
        startTime: offering.startTimeText,
        endTime: offering.endTimeText,
      },
      session: { id: session.id, status: session.status, date: session.datePh },
      summary: {
        ...summary,
        missingRecords: totalEnrollments - summary.totalRecords,
      },
    };
  }

  export function classAttendanceStudentView(
    recordsAndSummary: Awaited<
      ReturnType<
        Services.AttendanceQuery.Service["fetchHistoryAndSummaryForEnrollment"]
      >
    >,
  ) {
    const { records, summary } = recordsAndSummary;

    const dto: Schemas.Dto.ClassAttendance.StudentView = {
      attendanceRecords: records.map((r) => {
        const { offering, session } = r;

        const { id, status, recordedAt } = r.record ?? {};

        return {
          offering: {
            id: offering.id,
            weekDay: offering.weekDay,
            startTime: offering.startTimeText,
            endTime: offering.endTimeText,
          },
          session: {
            id: session.id,
            status: session.status,
            date: session.datePh,
          },
          record: {
            id: id ?? -1,
            status: status ?? Data.attendanceStatus.absent,
            time: recordedAt ? TimeUtil.toPhTime(new Date(recordedAt)) : "N/A",
          },
        };
      }),
      summary: summary,
    };
    try {
      return Schemas.Dto.ClassAttendance.studentView.parse(dto);
    } catch (err) {
      throw Core.Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
        message: "Failed converting raw attendance to dto",
        err,
      });
    }
  }

  export function studentAttendanceProfessorView(
    enrollmentDetails: Awaited<
      ReturnType<Core.Services.EnrollmentQuery.Service["ensureForProfessor"]>
    >,
    historyAndSummary: Awaited<
      ReturnType<
        Services.AttendanceQuery.Service["fetchHistoryAndSummaryForEnrollment"]
      >
    >,
  ): Schemas.Dto.StudentAttendance.ProfessorView {
    const { student, enrollment } = enrollmentDetails;
    const { records, summary } = historyAndSummary;

    try {
      return {
        enrollment: {
          id: enrollment.id,
          status: enrollment.status,
        },
        student: {
          id: student.id,
          studentNumber: student.studentNumber,
          surname: student.surname,
          firstName: student.firstName,
          middleName: student.middleName,
        },
        attendanceRecords: records.map((row) => {
          const { session: cs, offering: co, record: ar } = row;

          const { id, status, recordedAt } = ar ?? {};

          return {
            offering: {
              id: co.id,
              weekDay: co.weekDay,
              startTime: co.startTimeText,
              endTime: co.endTimeText,
            },
            session: { id: cs.id, status: cs.status, date: cs.datePh },
            record: {
              id: id ?? -1,
              status: status ?? Data.attendanceStatus.absent,
              time: recordedAt
                ? TimeUtil.toPhTime(new Date(recordedAt))
                : "N/A",
            },
          };
        }),
        summary: summary,
      };
    } catch (err) {
      throw Core.Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
        message: "Failed to convert raw attendance to dto.",
        err,
      });
    }
  }
}
