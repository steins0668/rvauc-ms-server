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
      ReturnType<Services.AttendanceQuery.Service["fetchRecordsAndSummary"]>
    >,
    sessionCount: number,
  ) {
    const { records, summary } = recordsAndSummary;

    const dto = {
      attendanceRecords: records.map((ar) => {
        return {
          id: ar.id,
          status: ar.status,
          date: ar.datePh,
          time: TimeUtil.toPhTime(new Date(ar.recordedAt)),
        };
      }),
      summary: {
        ...summary,
        missingRecords: sessionCount - summary.totalRecords, // ! temporary until class session tracking is implemented
      },
    };

    return Schemas.Dto.ClassAttendance.studentView.parse(dto);
  }

  export function studentAttendanceProfessorView(
    cls: Awaited<
      ReturnType<Core.Services.ClassQuery.Service["ensureClassWithCourse"]>
    >,
    enrollment: Awaited<
      ReturnType<
        Core.Services.EnrollmentQuery.Service["ensureEnrollmentsWithStudentGraph"]
      >
    >,
    recordsAndSummary: Awaited<
      ReturnType<
        Services.AttendanceQuery.Service["fetchRecordsAndSummaryWithSessionAndOffering"]
      >
    >,
  ): Schemas.Dto.StudentAttendance.ProfessorView {
    const { student } = enrollment;
    const { course } = cls;
    const { records, summary } = recordsAndSummary;

    return {
      class: {
        id: cls.id,
        classNumber: cls.classNumber,
        course: { code: course.code, name: course.name },
      },
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        student: {
          studentNumber: student.studentNumber,
          department: student.department.name,
          yearLevel: student.yearLevel,
          block: student.block,
          surname: student.user.surname,
          firstName: student.user.firstName,
          middleName: student.user.middleName,
          gender: student.user.gender,
        },
      },
      attendanceRecords: records.map((ar) => {
        const { classSession: cs } = ar;
        const { classOffering: co } = cs;

        return {
          classOffering: {
            id: co.id,
            weekDay: co.weekDay,
            room: co.rooms?.name ?? "N/A",
            startTimeText: co.startTimeText,
            endTimeText: co.endTimeText,
            startTime: co.startTime,
            endTime: co.endTime,
          },
          record: {
            id: ar.id,
            status: ar.status,
            date: ar.datePh,
            time: TimeUtil.toPhTime(new Date(ar.recordedAt)),
          },
        };
      }),
      summary: { ...summary, missingRecords: 0 }, //  todo: update this to have logic for trackign misssing records
    };
  }
}
