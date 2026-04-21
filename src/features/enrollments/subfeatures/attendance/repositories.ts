import { and, eq, or, sql, SQL, SQLWrapper } from "drizzle-orm";
import { DbContext, DbOrTx } from "../../../../db/create-context";
import { attendanceRecords } from "../../../../models";
import { Repository } from "../../../../services";
import { BaseRepositoryType } from "../../../../types";
import { RepositoryUtil } from "../../../../utils";
import { Types } from "./types";
import { Data } from "./data";

export namespace Repositories {
  export class AttendanceRecord extends Repository<Types.Tables.AttendanceRecord> {
    public constructor(context: DbContext) {
      super(context, attendanceRecords);
    }

    public async queryMinimalShapeWithSessionAndOffering(args: {
      constraints?: BaseRepositoryType.QueryConstraints;
      where?:
        | NonNullable<
            Parameters<DbContext["query"]["attendanceRecords"]["findMany"]>[0]
          >["where"]
        | undefined;
      orderBy?:
        | NonNullable<
            Parameters<DbContext["query"]["attendanceRecords"]["findMany"]>[0]
          >["orderBy"]
        | undefined;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { where, orderBy, dbOrTx } = args;
      const { limit = 6, offset = undefined } = args.constraints ?? {};

      return await (dbOrTx ?? this._dbContext).query.attendanceRecords.findMany(
        {
          where,
          orderBy,
          limit,
          offset,
          columns: {
            classId: false,
            recordCount: false,
            recordedMs: false,
          },
          with: {
            classSession: {
              columns: { id: true, datePh: true, status: true },
              with: {
                classOffering: {
                  columns: { classId: false, roomId: false },
                  with: {
                    rooms: { columns: { name: true } },
                  },
                },
              },
            },
          },
        },
      );
    }

    public async queryMinimalShape(args: {
      constraints?: BaseRepositoryType.QueryConstraints;
      where?:
        | NonNullable<
            Parameters<DbContext["query"]["attendanceRecords"]["findMany"]>[0]
          >["where"]
        | undefined;
      orderBy?:
        | NonNullable<
            Parameters<DbContext["query"]["attendanceRecords"]["findMany"]>[0]
          >["orderBy"]
        | undefined;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { where, orderBy, dbOrTx } = args;
      const { limit = 6, offset = undefined } = args.constraints ?? {};

      return await (dbOrTx ?? this._dbContext).query.attendanceRecords.findMany(
        {
          where,
          orderBy,
          limit,
          offset,
          columns: {
            classId: false,
            recordCount: false,
            recordedMs: false,
          },
        },
      );
    }

    /**
     * @description
     * ! THIS METHOD WILL ONLY COUNT THE EXISTING RECORDS. IF YOU WANT TO GET THE TRUE TOTAL OF ABSENCES, YOU MAY HAVE TO CROSS CHECK AGAINST THE TOTAL ENROLLEES IN A CLASS
     * @param args
     * @returns
     */
    public async selectSummary(args: {
      where?: SQL | undefined;
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { where, dbOrTx } = args;

      const { present, absent, late, excused } = Data.attendanceStatus;

      const context = dbOrTx ?? this._dbContext;

      const query = context
        .select({
          present: sql<number>`count(case when ${attendanceRecords.status} = ${present} then 1 end)`,
          absent: sql<number>`count(case when ${attendanceRecords.status} = ${absent} then 1 end)`,
          late: sql<number>`count(case when ${attendanceRecords.status} = ${late} then 1 end)`,
          excused: sql<number>`count(case when ${attendanceRecords.status} = ${excused} then 1 end)`,
          totalRecords: sql<number>`count(*)`,
        })
        .from(attendanceRecords);

      if (where) query.where(where);

      return await query.then(
        (r) =>
          r[0] ?? {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            totalRecords: 0,
          },
      );
    }

    public async execInsert<T>(
      args: Types.Repository.InsertArgs.AttendanceRecord<T>,
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
      args: Types.Repository.QueryArgs.AttendanceRecord<T>,
    ) {
      const query = (args.dbOrTx ?? this._dbContext).query.attendanceRecords;
      return await args.fn(query, AttendanceRecord.buildWhereClause);
    }

    public async execUpdate<T>(
      args: Types.Repository.UpdateArgs.AttendanceRecord<T>,
    ) {
      const update = (args.dbOrTx ?? this._dbContext).update(attendanceRecords);
      return await args.fn(update, AttendanceRecord.buildWhereClause);
    }

    public async execDelete<T>(
      args: Types.Repository.DeleteArgs.AttendanceRecord<T>,
    ) {
      const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
        attendanceRecords,
      );
      return await args.fn(deleteBase, AttendanceRecord.buildWhereClause);
    }

    /**
     * @deprecated
     * ! DO NOT USE
     * @param filter
     * @returns
     */
    public static buildWhereClause(
      filter?: Types.Repository.QueryFilters.AttendanceRecord,
    ): SQL | undefined {
      return undefined;
    }

    public static sqlWhere(
      builder: Types.Repository.WhereBuilders.AttendanceRecord,
    ) {
      return builder(attendanceRecords, RepositoryUtil.filters);
    }

    public static sqlOrderBy(
      builder: Types.Repository.OrderBuilders.AttendanceRecord,
    ) {
      return builder(attendanceRecords, RepositoryUtil.orderOperators);
    }
  }
}
