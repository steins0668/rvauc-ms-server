import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../../db/create-context";
import { attendanceRecords } from "../../../../models";
import { Repository } from "../../../../services";
import { RepositoryUtil } from "../../../../utils";
import { Types } from "./types";

export namespace Repositories {
  export class AttendanceRecord extends Repository<Types.Tables.AttendanceRecord> {
    public constructor(context: DbContext) {
      super(context, attendanceRecords);
    }

    public async execInsert<T>(
      args: Types.Repository.InsertArgs.AttendanceRecord<T>
    ) {
      const insert = (args.dbOrTx ?? this._dbContext).insert(attendanceRecords);
      return await args.fn({
        table: attendanceRecords,
        insert,
        converter: AttendanceRecord.buildWhereClause,
        sql,
      });
    }

    public async execQuery<T>(
      args: Types.Repository.QueryArgs.AttendanceRecord<T>
    ) {
      const query = (args.dbOrTx ?? this._dbContext).query.attendanceRecords;
      return await args.fn(query, AttendanceRecord.buildWhereClause);
    }

    public async execUpdate<T>(
      args: Types.Repository.UpdateArgs.AttendanceRecord<T>
    ) {
      const update = (args.dbOrTx ?? this._dbContext).update(attendanceRecords);
      return await args.fn(update, AttendanceRecord.buildWhereClause);
    }

    public async execDelete<T>(
      args: Types.Repository.DeleteArgs.AttendanceRecord<T>
    ) {
      const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
        attendanceRecords
      );
      return await args.fn(deleteBase, AttendanceRecord.buildWhereClause);
    }

    public static buildWhereClause(
      filter?: Types.Repository.QueryFilters.AttendanceRecord
    ): SQL | undefined {
      const conditions = [];

      if (filter) {
        const {
          filterType = "or",
          id,
          studentId,
          enrollmentId,
          status,
          recordCount,
          recordedAt,
          recordedMs,
          datePh,
          custom,
        } = filter;

        if (id !== undefined) conditions.push(eq(attendanceRecords.id, id));
        if (studentId !== undefined)
          conditions.push(eq(attendanceRecords.studentId, studentId));
        if (enrollmentId !== undefined)
          conditions.push(eq(attendanceRecords.enrollmentId, enrollmentId));
        if (status && status.trim())
          conditions.push(eq(attendanceRecords.status, status));
        if (recordCount !== undefined)
          conditions.push(eq(attendanceRecords.recordCount, recordCount));
        if (recordedAt && recordedAt.trim())
          conditions.push(eq(attendanceRecords.recordedAt, recordedAt));
        if (recordedMs !== undefined)
          conditions.push(eq(attendanceRecords.recordedMs, recordedMs));
        if (datePh && datePh.trim())
          conditions.push(eq(attendanceRecords.datePh, datePh));
        if (custom)
          conditions.push(...custom(attendanceRecords, RepositoryUtil.filters));

        if (conditions.length > 0)
          return filterType === "or" ? or(...conditions) : and(...conditions);
      }

      return undefined;
    }
  }
}
