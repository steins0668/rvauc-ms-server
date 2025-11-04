import { and, eq, or, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { sessionTokens } from "../../../models";
import { Repository } from "../../../services";
import { Tables, RepositoryTypes } from "../types";

export class SessionTokenRepository extends Repository<Tables.SessionTokens> {
  public constructor(context: DbContext) {
    super(context, sessionTokens);
  }

  public async execInsert<T>(args: RepositoryTypes.InsertArgs.SessionToken<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(sessionTokens);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(args: RepositoryTypes.QueryArgs.SessionToken<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.sessionTokens;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(args: RepositoryTypes.UpdateArgs.SessionToken<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(sessionTokens);
    return await args.fn(update, this.buildWhereClause);
  }

  private buildWhereClause(
    filter: RepositoryTypes.QueryFilters.SessionToken
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, sessionId, tokenHash, isUsed } = filter;

      if (id !== undefined) conditions.push(eq(sessionTokens.id, id));
      if (sessionId !== undefined)
        conditions.push(eq(sessionTokens.sessionId, sessionId));
      if (tokenHash && tokenHash.trim())
        conditions.push(eq(sessionTokens.tokenHash, tokenHash));
      if (isUsed !== undefined)
        conditions.push(eq(sessionTokens.isUsed, isUsed));

      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }
}
