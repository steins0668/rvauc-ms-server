import { and, eq, or, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { uniformTypes } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class UniformTypeRepository extends Repository<Types.Db.Tables.UniformType> {
  public constructor(context: DbContext) {
    super(context, uniformTypes);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.UniformType<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(uniformTypes);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.UniformType<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.uniformTypes;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.UniformType<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(uniformTypes);
    return await args.fn(update, this.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.UniformType<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(uniformTypes);
    return await args.fn(deleteBase, this.buildWhereClause);
  }

  /**
   * @deprecated ! don't use
   * @param filter
   * @returns
   */
  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.UniformType,
  ): SQL | undefined {
    return undefined;
  }
}
