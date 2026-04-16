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
  }
}
