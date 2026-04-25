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
    recordsAndSummary: Awaited<
      ReturnType<
        Services.AttendanceQuery.Service["fetchSessionRecordsAndSummary"]
      >
    >,
  ): Schemas.Dto.ClassAttendance.ProfessorView {
    const { classOffering: offering } = session;
    const { records, summary } = recordsAndSummary;

    try {
      return {
        attendanceRecords: records.map((r) => {
          const { enrollment: e, student: s, record } = r;

          const { id = null, status, recordedAt } = record ?? {};

          return {
            enrollment: { id: e.id, status: e.status },
            student: {
              id: s.id,
              studentNumber: s.studentNumber,
              surname: s.surname,
              firstName: s.firstName,
              middleName: s.middleName,
            },
            record: {
              id,
              status: status ?? Data.attendanceStatus.absent,
              time: recordedAt
                ? TimeUtil.toPhTime(new Date(recordedAt))
                : "N/A",
            },
          };
        }),
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
        summary: summary,
      };
    } catch (err) {
      throw Core.Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
        message: "Failed to map raw attendance to dto.",
        err,
      });
    }
  }

  export function classAttendanceStudentView(
    recordsAndSummary: Awaited<
      ReturnType<
        Services.AttendanceQuery.Service["fetchHistoryAndSummaryForEnrollment"]
      >
    >,
  ) {
    const { history, summary } = recordsAndSummary;

    const dto: Schemas.Dto.ClassAttendance.StudentView = {
      history: history.map((r) => {
        const { offering, session } = r;

        const { id = null, status, recordedAt } = r.record ?? {};

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
            id,
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
    const { history, summary } = historyAndSummary;

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
        history: history.map((row) => {
          const { session: cs, offering: co, record: ar } = row;

          const { id = null, status, recordedAt } = ar ?? {};

          return {
            offering: {
              id: co.id,
              weekDay: co.weekDay,
              startTime: co.startTimeText,
              endTime: co.endTimeText,
            },
            session: { id: cs.id, status: cs.status, date: cs.datePh },
            record: {
              id,
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
