import { TimeUtil } from "../../../../../utils";
import { Data } from "../data";
import { Schemas } from "../schemas";

export namespace Policy {
  export namespace Attendance {
    export function isWithinSchedule(args: {
      recordedMs: number;
      session: { startTimeMs: number; endTimeMs: number };
    }) {
      const { recordedMs, session } = args;

      return (
        session.startTimeMs <= recordedMs && recordedMs < session.endTimeMs
      );
    }

    /**
     *
     * @param attendanceDate - date of attendance
     * @param schedStartTime - scheduled start time in seconds
     * @param schedEndTime - scheduled end time in seconds
     * @returns
     */
    export function getAttendanceStatus(args: {
      values: {
        attendanceTime: number;
        session: { startTimeMs: number; endTimeMs: number };
      };
    }) {
      const { attendanceTime, session } = args.values;

      const GRACE_PERIOD_OFFSET_MS = 15 * 60 * 1000; //  ! 15 minutes grace period
      const GRACE_TIME_MS = session.startTimeMs + GRACE_PERIOD_OFFSET_MS;

      return attendanceTime >= session.endTimeMs
        ? Data.attendanceStatus.absent
        : attendanceTime > GRACE_TIME_MS
          ? Data.attendanceStatus.late
          : Data.attendanceStatus.present;
    }
  }

  export namespace AttendanceSumbission {
    export const normalizeRecord = (
      record: Schemas.RequestBody.RecordSubmission["records"][number],
    ): Schemas.Dto.ClassAttendance.NormalizedRecord => {
      return {
        enrollmentId: record.enrollmentId,
        status: record.status,
        recordedAt: record.recordedDate.toISOString(),
        recordedMs: record.recordedDate.getTime(),
      };
    };

    export const organizeRecords = (
      session: { datePh: string; startTimeMs: number; endTimeMs: number },
      enrolleeIds: Set<number>,
      records: Schemas.RequestBody.RecordSubmission["records"],
    ) => {
      let upserts: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
      let rejects: Schemas.Dto.ClassAttendance.RejectedRecords = [];

      for (const r of records) {
        const normalized = normalizeRecord(r);

        const { status } = normalized;

        const isWithinSchedule = Attendance.isWithinSchedule({
          recordedMs: normalized.recordedMs,
          session,
        });

        const isTimeIrrelevant = status === "absent" || status === "excused";
        const isValidTime = isTimeIrrelevant || isWithinSchedule;
        const isEnrolled = enrolleeIds.has(r.enrollmentId);

        const reasons: Schemas.Dto.ClassAttendance.RejectedRecord["reasons"] =
          [];

        if (!isValidTime) reasons.push("OUT_OF_SCHEDULE");
        if (!isEnrolled) reasons.push("NOT_ENROLLED");

        reasons.length
          ? rejects.push({ record: normalized, reasons })
          : upserts.push(normalized);
      }

      return { upserts, rejects };
    };
  }
}
