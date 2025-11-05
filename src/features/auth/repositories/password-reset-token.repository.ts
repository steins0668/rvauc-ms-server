import { and, eq, lte, or } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { passwordResetTokens } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class PasswordResetTokenRepository extends Repository<Types.Tables.PasswordResetToken> {
  public constructor(context: DbContext) {
    super(context, passwordResetTokens);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.PasswordResetToken<T>
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(
      passwordResetTokens
    );
    return await args.fn(deleteBase, this.buildWhereClause);
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.PasswordResetToken<T>
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(passwordResetTokens);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(
    args: Types.Repository.QueryArgs.PasswordResetToken<T>
  ) {
    const query = (args.dbOrTx ?? this._dbContext).query.passwordResetTokens;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.PasswordResetToken<T>
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(passwordResetTokens);
    return await args.fn(update, this.buildWhereClause);
  }

  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.PasswordResetToken
  ) {
    const conditions = [];

    if (filter) {
      const { id, userId, tokenHash, expiresAt, isUsed } = filter;

      if (id !== undefined) conditions.push(eq(passwordResetTokens.id, id));
      if (userId !== undefined)
        conditions.push(eq(passwordResetTokens.userId, userId));
      if (tokenHash && tokenHash.trim())
        conditions.push(eq(passwordResetTokens.tokenHash, tokenHash));
      if (expiresAt && expiresAt.trim())
        conditions.push(lte(passwordResetTokens.expiresAt, expiresAt));
      if (isUsed !== undefined)
        conditions.push(eq(passwordResetTokens.isUsed, isUsed));

      if (conditions.length > 0)
        return filter.filterType === "or"
          ? or(...conditions)
          : and(...conditions);
    }

    return undefined;
  }
}
