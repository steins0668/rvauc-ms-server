import { and, eq, lte, or } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { signInRequests } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class SignInRequestRepository extends Repository<Types.Tables.SignInRequest> {
  public constructor(context: DbContext) {
    super(context, signInRequests);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.SignInRequest<T>
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(signInRequests);
    return await args.fn(deleteBase, this.buildWhereClause);
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.SignInRequest<T>
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(signInRequests);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.SignInRequest<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.signInRequests;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.SignInRequest<T>
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(signInRequests);
    return await args.fn(update, this.buildWhereClause);
  }

  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.SignInRequest
  ) {
    const conditions = [];

    if (filter) {
      const { id, userId, codeHash, expiresAt, isUsed } = filter;

      if (id !== undefined) conditions.push(eq(signInRequests.id, id));
      if (userId !== undefined)
        conditions.push(eq(signInRequests.userId, userId));
      if (codeHash && codeHash.trim())
        conditions.push(eq(signInRequests.codeHash, codeHash));
      if (expiresAt && expiresAt.trim())
        conditions.push(lte(signInRequests.expiresAt, expiresAt));
      if (isUsed !== undefined)
        conditions.push(eq(signInRequests.isUsed, isUsed));

      if (conditions.length > 0)
        return filter.filterType === "or"
          ? or(...conditions)
          : and(...conditions);
    }

    return undefined;
  }
}
