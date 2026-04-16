import { TimeUtil } from "../../../../utils";
import { Data } from "./data";

export namespace Utils {
  export namespace AttendancePolicy {
    export function isWithinSchedule(
      recordedDate: Date,
      session: { startTimeMs: number; endTimeMs: number },
    ) {
      const offsetMs = session.startTimeMs - 30 * 60 * 1000; // ! accepting attendance 30 mins before class
      const recordedMs = recordedDate.getTime();

      return offsetMs <= recordedMs && recordedMs < session.endTimeMs;
    }

    /**
     *
     * @param attendanceDate - date of attendance
     * @param schedStartTime - scheduled start time in seconds
     * @param schedEndTime - scheduled end time in seconds
     * @returns
     */
    export function getAttendanceStatus(args: {
      attendanceDate: Date;
      schedStartTime: number;
      schedEndTime: number;
    }) {
      const { attendanceDate, schedStartTime, schedEndTime } = args;
      const attendanceTime = TimeUtil.secondsSinceMidnightPh(attendanceDate);

      const GRACE_PERIOD_OFFSET_SECONDS = 15 * 60; //  ! 15 minutes grace period
      const graceTime = schedStartTime + GRACE_PERIOD_OFFSET_SECONDS;

      return attendanceTime >= schedEndTime
        ? Data.attendanceStatus.absent
        : attendanceTime > graceTime
          ? Data.attendanceStatus.late
          : Data.attendanceStatus.present;
    }
  }
}
