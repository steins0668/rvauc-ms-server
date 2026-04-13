import { randomInt } from "crypto";
import { DbOrTx } from "../../../../db/create-context";
import { TimeUtil } from "../../../../utils";
import { SampleData as Enrollments } from "../sample-data";

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
    // classOfferings: any[];
    // enrollments: any[];
    // classes: any[];
    dbOrTx?: DbOrTx | undefined;
  }) => {
    const results = [];
    let id = 1;

    const current = new Date(args.startDate);
    const end = new Date(args.endDate);

    while (current <= end) {
      const datePh = TimeUtil.toPhDate(current);
      const weekDay = TimeUtil.toPhDay(current);

      const offeringsToday = Enrollments.classOfferings.filter(
        (e) => e.weekDay === weekDay,
      );

      for (const o of offeringsToday) {
        const cls = Enrollments.classes.find((c) => c.id === o.classId);

        const enrollees = Enrollments.enrollments.filter(
          (e) => e.classOfferingId === o.id,
        );

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
            studentId: e.studentId,
            classId: o.classId,
            classOfferingId: o.id,
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
