import { randomInt } from "crypto";
import { TimeUtil } from "../../../../utils";
import { Enrollments as EnrollmentsFeature } from "../../../../features/enrollments";
import { Attendance } from "../../../../features/enrollments/subfeatures/attendance";

export namespace SampleData {
  type Status = "present" | "late" | "absent";

  const pickStatus = (): Status => {
    const r = Math.random();
    if (r < 0.7) return "present";
    if (r < 0.9) return "late";
    return "absent";
  };

  function generateRecordedDate(args: {
    status: Status;
    date: Date;
    startTime: number;
    endTime: number;
  }) {
    if (args.status === "present") {
      // 10 mins before → 10 mins after start
      const offset = randomInt(-600, 600);
      const timeRange = TimeUtil.getPhTimeRange(
        args.date,
        args.startTime,
        args.endTime,
      );

      return new Date(timeRange.startTimeMs + offset * 1000);
    }

    if (args.status === "late") {
      // 30–60 mins after start
      const offset = randomInt(1800, 3600);
      const timeRange = TimeUtil.getPhTimeRange(
        args.date,
        args.startTime,
        args.endTime,
      );

      return new Date(timeRange.startTimeMs + offset * 1000);
    }

    // absent → exactly at end time
    const timeRange = TimeUtil.getPhTimeRange(
      args.date,
      args.startTime,
      args.endTime,
    );

    return new Date(timeRange.endTimeMs);
  }

  export const generateAttendanceRecords = (args: {
    startDate: string; //  yy-mm-dd
    endDate: string; //  yy-mm-dd
    classes: EnrollmentsFeature.Types.ViewModels.Class[];
    classSessions: EnrollmentsFeature.Types.ViewModels.ClassSession[];
    classOfferings: EnrollmentsFeature.Types.ViewModels.ClassOffering[];
    enrollments: EnrollmentsFeature.Types.ViewModels.Enrollment[];
  }) => {
    const {
      startDate,
      endDate,
      classes,
      classSessions,
      classOfferings,
      enrollments,
    } = args;
    const results: Attendance.Types.InsertModels.AttendanceRecord[] = [];
    let id = 1;

    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const datePh = TimeUtil.toPhDate(current);

      const sessionsToday = classSessions.filter((cs) => cs.datePh === datePh);

      for (const s of sessionsToday) {
        const cls = classes.find((c) => c.id === s.classId);
        const o = classOfferings.find((c) => c.id === s.classOfferingId);
        const enrollees = enrollments.filter((e) => e.classId === s.classId);

        if (!o) throw new Error("Expected a class offering.");

        for (const e of enrollees) {
          const status = pickStatus();

          const recordedDate = generateRecordedDate({
            status,
            date: current,
            startTime: o.startTime,
            endTime: o.endTime,
          });

          const iso = recordedDate.toISOString();
          const recordedMs = recordedDate.getTime();

          results.push({
            id: id++,
            classId: o.classId,
            classSessionId: s.id,
            enrollmentId: e.id,
            status,
            createdAt: iso,
            recordedAt: iso,
            recordedMs,
            updatedAt: iso,
            updatedByUserId: cls?.professorId ?? null,
            datePh,
            recordCount: 1,
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return results;
  };
}
