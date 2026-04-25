import { SQLWrapper } from "drizzle-orm";
import { DbOrTx } from "../../../../../db/create-context";
import { Schema } from "../../../../../models";
import { BaseRepositoryType } from "../../../../../types";
import { RepositoryUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories } from "../repositories";

export namespace AttendanceQuery {
  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly EMPTY_ATTENDANCE_RESULT = {
      records: [],
      summary: {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        totalRecords: 0,
      },
    };

    constructor(args: { attendanceRecordRepo: Repositories.AttendanceRecord }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
    }

    /**
     * @description
     * Queries attendance records matching a set of enrollment ids, and optional class id or class session id
     */
    async fetchRecordsAndSummary(args: {
      values: {
        classId?: number;
        classSessionId?: number;
        enrollmentIds: number[];
      };
      constraints?: BaseRepositoryType.QueryConstraints;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { enrollmentIds } = args.values;

      if (!enrollmentIds.length) return this.EMPTY_ATTENDANCE_RESULT;

      const where = this.whereAttendanceRecordsAndSummary(args);

      let records;

      try {
        records = await this._attendanceRecordRepo.queryMinimalShape({
          constraints: args.constraints,
          where,
          orderBy: (ar, { desc }) => desc(ar.recordedMs),
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retreiving attendance records.",
          err,
        });
      }

      let summary = await this.fetchSummary({
        where,
        dbOrTx: args.dbOrTx,
      });

      return { records, summary };
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

    /**
     * @description
     * Filter builder for querying attendance records and summary
     */
    private whereAttendanceRecordsAndSummary(args: {
      values: {
        classId?: number | undefined;
        classSessionId?: number | undefined;
        enrollmentIds: number[];
      };
    }) {
      const { classId, classSessionId, enrollmentIds } = args.values;

      const { attendanceRecords: ar } = Schema;
      const { and, eq, inArray } = RepositoryUtil.filters;

      const conditions: (SQLWrapper | undefined)[] = [
        inArray(ar.enrollmentId, enrollmentIds),
      ];

      if (classId) conditions.push(eq(ar.classId, classId));
      if (classSessionId)
        conditions.push(eq(ar.classSessionId, classSessionId));

      return and(...conditions.filter(Boolean));
    }

    /**
     * @description
     * Fetches attendance summary consisting of:
     * 1. Present
     * 2. Absent
     * 3. Late
     * 4. Excused
     * 5. Total Records
     * @param args
     * @returns
     */
    private async fetchSummary(
      args: NonNullable<
        Parameters<Repositories.AttendanceRecord["selectSummary"]>[0]
      >,
    ) {
      try {
        return await this._attendanceRecordRepo.selectSummary(args);
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed retrieving attendance summary.",
          err,
        });
      }
    }
  }
}
