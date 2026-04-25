import { DbOrTx } from "../../../../../db/create-context";
import { BaseRepositoryType } from "../../../../../types";
import { Core } from "../../../core";
import { Repositories } from "../repositories";

export namespace AttendanceQuery {
  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;

    constructor(args: { attendanceRecordRepo: Repositories.AttendanceRecord }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
    }

    /**
     * @description
     * Fetches attendance records and summary for a class session.
     * Includes enrollment and student details for each record.
     */
    async fetchSessionRecordsAndSummary(
      args: Parameters<Repositories.AttendanceRecord["fetchSessionRecords"]>[0],
    ) {
      try {
        const records =
          await this._attendanceRecordRepo.fetchSessionRecords(args);
        const summary =
          await this._attendanceRecordRepo.fetchSessionSummary(args);

        return { records, summary };
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retreiving attendance records.",
          err,
        });
      }
    }

    /**
     * @description
     * Fetches the attendance history and summary of an enrollment.
     * Includes class session and class offering details for each attendance record.
     */
    async fetchHistoryAndSummaryForEnrollment(args: {
      values: { enrollmentId: number };
      constraints?: BaseRepositoryType.QueryConstraints;
      dbOrTx?: DbOrTx | undefined;
    }) {
      try {
        const history =
          await this._attendanceRecordRepo.fetchHistoryForEnrollment(args);
        const summary =
          await this._attendanceRecordRepo.fetchSummaryForEnrollment(args);

        return { history, summary };
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retreiving attendance records.",
          err,
        });
      }
    }
  }
}
