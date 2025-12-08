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

    const endedClassesQ = await classEndDetection.getForToday({
      date: Clock.now(),
      termId: term.id,
    });

    if (!endedClassesQ.success) {
      console.error(endedClassesQ.error);
      return;
    }

    const { result: endedClasses } = endedClassesQ;

    const absenteeRecords: Types.InsertModels.AttendanceRecord[] = [];

    const date = Clock.now();
    const dateIso = date.toISOString();
    const timeMs = date.getTime();
    const timePh = TimeUtil.toPhTime(date);
    const datePh = TimeUtil.toPhDate(date);

    for (const _class of endedClasses) {
      const { enrollments } = _class;

      const records: Types.InsertModels.AttendanceRecord[] = enrollments.map(
        (e) => ({
          studentId: e.studentId,
          classId: _class.id,
          status: "absent",
          recordedAt: dateIso,
          recordedMs: timeMs,
          datePh: datePh,
        })
      );

      absenteeRecords.push(...records);
    }

    const recorded = await attendanceRegistration.newRecords({
      values: absenteeRecords,
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
