import { Clock, TimeUtil } from "../../../../utils";
import { Core } from "../../core";
import { Services } from "./services";
import { Types } from "./types";

export namespace Jobs {
  export async function markAbsent() {
    const classEndDetection = await Core.Services.ClassEndDetection.create();
    const attendanceRegistration =
      await Services.AttendanceRegistration.create();
    const termData = await Core.Services.TermData.create();

    const termQ = await termData.getCurrentTerm();

    if (!termQ.success) {
      console.error(termQ.error);
      return;
    }

    const { result: term } = termQ;

    const date = new Date();
    const dateIso = date.toISOString();
    const timeMs = date.getTime();
    const timePh = TimeUtil.toPhTime(date);
    const datePh = TimeUtil.toPhDate(date);

    const endedClassesQ = await classEndDetection.getForToday({
      date: date,
      termId: term.id,
    });

    if (!endedClassesQ.success) {
      console.error(endedClassesQ.error);
      return;
    }

    const { result: endedClasses } = endedClassesQ;

    console.log("ended classes: ", endedClasses.length);

    if (endedClasses.length === 0) return;

    const attendanceRecords: Types.InsertModels.AttendanceRecord[] = [];

    for (const classOffering of endedClasses) {
      const { enrollments } = classOffering;

      const records: Types.InsertModels.AttendanceRecord[] = enrollments.map(
        (e) => ({
          studentId: e.studentId,
          classId: classOffering.classId,
          status: "absent",
          recordedAt: dateIso,
          recordedMs: timeMs,
          datePh: datePh,
        }),
      );

      attendanceRecords.push(...records);
    }

    console.log("attendance records: ", attendanceRecords.length);

    if (attendanceRecords.length === 0) return;

    console.log("recording...");
    const recorded = await attendanceRegistration.newRecords({
      values: attendanceRecords,
      onConflict: "doNothing",
    });

    if (!recorded.success) {
      console.error(recorded.error);
      return;
    }

    const { result } = recorded;

    console.log(`Recorded ${result.length} absentees at ${datePh} ${timePh}.`);
  }
}
