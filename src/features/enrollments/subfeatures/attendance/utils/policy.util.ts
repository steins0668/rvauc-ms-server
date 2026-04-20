import { TimeUtil } from "../../../../../utils";
import { Data } from "../data";
import { Schemas } from "../schemas";

export namespace Policy {
  export namespace Attendance {
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

  export namespace AttendanceSumbission {
    export const normalizeRecord = (
      record: Schemas.RequestBody.RecordSubmission["records"][number],
      session: { endTimeMs: number },
    ): Schemas.Dto.ClassAttendance.NormalizedRecord => {
      const finalDate =
        record.status === "absent"
          ? new Date(session.endTimeMs)
          : record.recordedDate;

      return {
        enrollmentId: record.enrollmentId,
        status: record.status,
        recordedDate: finalDate,
        recordedAt: finalDate.toISOString(),
        recordedMs: finalDate.getTime(),
      };
    };

    export const organizeRecords = (
      records: Schemas.RequestBody.RecordSubmission["records"],
      session: { datePh: string; startTimeMs: number; endTimeMs: number },
    ) => {
      let upserts: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
      let rejects: Schemas.Dto.ClassAttendance.NormalizedRecords = [];

      for (const r of records) {
        const normalized = normalizeRecord(r, session);

        const isSameDate =
          TimeUtil.toPhDate(normalized.recordedDate) === session.datePh;

        const isReject =
          !isSameDate ||
          !Attendance.isWithinSchedule(normalized.recordedDate, session);

        isReject ? rejects.push(normalized) : upserts.push(normalized);
      }

      return { upserts, rejects };
    };
  }
}
