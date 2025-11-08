import { and, eq, isNull, or, SQL } from "drizzle-orm";
import { DbContext } from "../../db/create-context";
import { violationRecords } from "../../models";
import { Repository } from "../../services";
import { Types } from "./types";

export namespace Repositories {
  export class ViolationRecord extends Repository<Types.Db.Tables.ViolationRecord> {
    public constructor(context: DbContext) {
      super(context, violationRecords);
    }

    public async execInsert<T>(
      args: Types.Repository.InsertArgs.ViolationRecord<T>
    ) {
      const insert = (args.dbOrTx ?? this._dbContext).insert(violationRecords);
      return await args.fn(insert, this.buildWhereClause);
    }

    public async execQuery<T>(
      args: Types.Repository.QueryArgs.ViolationRecord<T>
    ) {
      const query = (args.dbOrTx ?? this._dbContext).query.violationRecords;
      return await args.fn(query, this.buildWhereClause);
    }

    public async execUpdate<T>(
      args: Types.Repository.UpdateArgs.ViolationRecord<T>
    ) {
      const update = (args.dbOrTx ?? this._dbContext).update(violationRecords);
      return await args.fn(update, this.buildWhereClause);
    }

    public async execDelete<T>(
      args: Types.Repository.DeleteArgs.ViolationRecord<T>
    ) {
      const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
        violationRecords
      );
      return await args.fn(deleteBase, this.buildWhereClause);
    }

    protected buildWhereClause(
      filter?: Types.Repository.QueryFilters.ViolationRecord
    ): SQL | undefined {
      const conditions = [];

      if (filter) {
        if (filter.id !== undefined)
          conditions.push(eq(violationRecords.id, filter.id));

        if (filter.studentId !== undefined)
          conditions.push(eq(violationRecords.studentId, filter.studentId));

        if (filter.statusId !== undefined)
          conditions.push(eq(violationRecords.statusId, filter.statusId));

        if (filter.number !== undefined)
          conditions.push(eq(violationRecords.number, filter.number));

        if (filter.date !== undefined)
          conditions.push(eq(violationRecords.date, filter.date));

        const { complianceRecordId } = filter;
        if (complianceRecordId !== undefined) {
          conditions.push(
            complianceRecordId === null
              ? isNull(violationRecords.complianceRecordId)
              : eq(violationRecords.complianceRecordId, complianceRecordId)
          );
        }

        if (conditions.length > 0)
          return filter.filterType === "or"
            ? or(...conditions)
            : and(...conditions);
      }

      return undefined;
    }
  }
}
