import { and, eq, isNull, or, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { violationStatuses } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class ViolationStatusRepository extends Repository<Types.Db.Tables.ViolationStatus> {
  public constructor(context: DbContext) {
    super(context, violationStatuses);
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.ViolationStatus<T>,
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(violationStatuses);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(
    args: Types.Repository.QueryArgs.ViolationStatus<T>,
  ) {
    const query = (args.dbOrTx ?? this._dbContext).query.violationStatuses;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.ViolationStatus<T>,
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(violationStatuses);
    return await args.fn(update, this.buildWhereClause);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.ViolationStatus<T>,
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
      violationStatuses,
    );
    return await args.fn(deleteBase, this.buildWhereClause);
  }

  /**
   * @deprecated don't use this
   * @param filter
   * @returns
   */
  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.ViolationStatus,
  ): SQL | undefined {
    return undefined;
  }
}
