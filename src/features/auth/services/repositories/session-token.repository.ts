import { and, eq, or, SQL } from "drizzle-orm";
import { DbContext, TxContext } from "../../../../db/create-context";
import { sessionTokens } from "../../../../models";
import { Repository } from "../../../../services";
import {
  InsertModels,
  ViewModels,
  Tables,
  QueryFilters,
  QueryArgs,
  UpdateArgs,
} from "../../types";

type TokenId = {
  queryBy: "token_id";
  id: number;
};

type SessionId = {
  queryBy: "session_id";
  sessionId: number;
};

type TokenHash = {
  queryBy: "token_hash";
  tokenHash: string;
};

type QueryOptions = {
  dbOrTx?: DbContext | TxContext | undefined;
} & (TokenId | SessionId | TokenHash);

export class SessionTokenRepository extends Repository<Tables.SessionTokens> {
  public constructor(context: DbContext) {
    super(context, sessionTokens);
  }

  public async insertOne({
    dbOrTx,
    sessionToken,
  }: {
    dbOrTx: DbContext | TxContext | undefined;
    sessionToken: InsertModels.SessionToken;
  }): Promise<number | undefined> {
    const inserted = await this._insertOne({ dbOrTx, value: sessionToken });
    return inserted?.id;
  }

  public async execQuery<T>(args: QueryArgs.SessionToken<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.sessionTokens;
    return await args.fn(query, this._buildWhereClause);
  }

  //  todo: remove this
  public async getMany(
    queryOptions: {
      isAscending?: boolean;
      pageSize?: number;
      pageNumber?: number;
    } & QueryOptions
  ): Promise<ViewModels.SessionToken[]> {
    const whereClause = this.buildWhereClause(queryOptions);

    const tokens = await this._getMany({
      column: sessionTokens.sessionId,
      whereClause,
      ...queryOptions,
    });

    return tokens;
  }

  public async execUpdate<T>(args: UpdateArgs.SessionToken<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(sessionTokens);
    return await args.fn(update, this._buildWhereClause);
  }

  //  todo: remove this
  public async invalidateTokens(
    queryOptions: QueryOptions
  ): Promise<ViewModels.SessionToken[]> {
    const whereClause = this.buildWhereClause(queryOptions);
    const { dbOrTx = this._dbContext } = queryOptions;

    const updatedTokens = await dbOrTx
      .update(sessionTokens)
      .set({
        isUsed: true,
      })
      .where(whereClause)
      .returning();

    return updatedTokens;
  }

  private _buildWhereClause(
    filter: QueryFilters.SessionToken
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

  //  todo: remove this
  private buildWhereClause(queryOptions: QueryOptions) {
    switch (queryOptions.queryBy) {
      case "token_id":
        return eq(sessionTokens.id, queryOptions.id);
      case "session_id":
        return eq(sessionTokens.sessionId, queryOptions.sessionId);
      case "token_hash":
        return eq(sessionTokens.tokenHash, queryOptions.tokenHash);
      default:
        throw new Error("Invalid query method.");
    }
  }
}
