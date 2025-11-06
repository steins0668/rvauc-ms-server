import { and, eq, lte, or } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { passwordResetCodes } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class PasswordResetCodeRepository extends Repository<Types.Tables.PasswordResetCode> {
  public constructor(context: DbContext) {
    super(context, passwordResetCodes);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.PasswordResetCode<T>
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
      passwordResetCodes
    );
    return await args.fn(deleteBase, this.buildWhereClause);
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.PasswordResetCode<T>
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(passwordResetCodes);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(
    args: Types.Repository.QueryArgs.PasswordResetCode<T>
  ) {
    const query = (args.dbOrTx ?? this._dbContext).query.passwordResetCodes;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.PasswordResetCode<T>
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(passwordResetCodes);
    return await args.fn(update, this.buildWhereClause);
  }

  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.PasswordResetCode
  ) {
    const conditions = [];

    if (filter) {
      const { id, userId, tokenHash, expiresAt, isUsed } = filter;

      if (id !== undefined) conditions.push(eq(passwordResetCodes.id, id));
      if (userId !== undefined)
        conditions.push(eq(passwordResetCodes.userId, userId));
      if (tokenHash && tokenHash.trim())
        conditions.push(eq(passwordResetCodes.tokenHash, tokenHash));
      if (expiresAt && expiresAt.trim())
        conditions.push(lte(passwordResetCodes.expiresAt, expiresAt));
      if (isUsed !== undefined)
        conditions.push(eq(passwordResetCodes.isUsed, isUsed));

      if (conditions.length > 0)
        return filter.filterType === "or"
          ? or(...conditions)
          : and(...conditions);
    }

    return undefined;
  }
}
