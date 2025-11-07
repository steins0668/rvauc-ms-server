import { and, eq, or, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { complianceRecords } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class ComplianceRecordRepository extends Repository<Types.Db.Tables.ComplianceRecord> {
  public constructor(context: DbContext) {
    super(context, complianceRecords);
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.ComplianceRecord<T>
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(complianceRecords);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(
    args: Types.Repository.QueryArgs.ComplianceRecord<T>
  ) {
    const query = (args.dbOrTx ?? this._dbContext).query.complianceRecords;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.ComplianceRecord<T>
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(complianceRecords);
    return await args.fn(update, this.buildWhereClause);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.ComplianceRecord<T>
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
      complianceRecords
    );
    return await args.fn(deleteBase, this.buildWhereClause);
  }

  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.ComplianceRecord
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      if (filter.id !== undefined)
        conditions.push(eq(complianceRecords.id, filter.id));

      if (filter.studentId !== undefined)
        conditions.push(eq(complianceRecords.studentId, filter.studentId));

      if (filter.uniformTypeId !== undefined)
        conditions.push(
          eq(complianceRecords.uniformTypeId, filter.uniformTypeId)
        );

      if (filter.validFootwear !== undefined)
        conditions.push(
          eq(complianceRecords.validFootwear, filter.validFootwear)
        );

      if (filter.validUpperwear !== undefined)
        conditions.push(
          eq(complianceRecords.validUpperwear, filter.validUpperwear)
        );

      if (filter.validBottoms !== undefined)
        conditions.push(
          eq(complianceRecords.validBottoms, filter.validBottoms)
        );

      if (conditions.length > 0)
        return filter.filterType === "or"
          ? or(...conditions)
          : and(...conditions);
    }

    return undefined;
  }
}
