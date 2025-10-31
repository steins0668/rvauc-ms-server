import { TxContext } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { HashUtil, ResultBuilder } from "../../../../utils";
import { Session } from "../../error";
import { QueryArgs, SessionResult, ViewModels } from "../../types";
import { Repositories } from "../repositories";

export class SessionTokenRotator {
  private readonly _sessionTokenRepository: Repositories.SessionToken;
  private readonly _userSessionRepository: Repositories.UserSession;

  constructor(
    sessionTokenRepository: Repositories.SessionToken,
    userSessionTokenRepository: Repositories.UserSession
  ) {
    this._sessionTokenRepository = sessionTokenRepository;
    this._userSessionRepository = userSessionTokenRepository;
  }

  public async rotate(data: {
    sessionNumber: string;
    oldToken: string;
    newToken: string;
  }): Promise<
    SessionResult.Success<number, "SESSION_TOKEN_ROTATION"> | SessionResult.Fail
  > {
    const { sessionNumber, oldToken, newToken } = data;

    try {
      const result = await this._userSessionRepository.execTransaction(
        async (tx) => {
          //  updated last used for session
          const updatedId = await this.updateLastUsed({ tx, sessionNumber });

          //  invalidate old token
          await this.invalidateToken({ tx, oldToken });

          const newTknHash = HashUtil.byCrypto(newToken);

          await this.ensureTokenUnused({ tx, tknHash: newTknHash });

          //  add new token
          await this.storeNewTkn({
            tx,
            sessionId: updatedId,
            tokenHash: newTknHash,
          });

          return updatedId;
        }
      );

      return ResultBuilder.success(result, "SESSION_TOKEN_ROTATION");
    } catch (err) {
      const error = Session.normalizeError({
        name: "SESSION_TOKEN_ROTATION_ERROR",
        message: "Failed rotating tokens. Please try again later.",
        err,
      });

      return ResultBuilder.fail(error);
    }
  }
  //#region updateSession helpers
  /**
   * Update `lastUsed` field for session with the matching hash of the provided
   * `sessionNumber`.
   * @param options
   * @returns
   */
  private async updateLastUsed(options: {
    tx: TxContext;
    sessionNumber: string;
  }): Promise<number> {
    const getUpdateErr = (cause?: unknown) => {
      return new DbAccess.ErrorClass({
        name: "DB_ACCESS_UPDATE_ERROR",
        message: "Failed updating session.",
        cause,
      });
    };

    try {
      //  updated last used for session
      const updatedId = await this._userSessionRepository.updateLastUsed({
        dbOrTx: options.tx,
        queryBy: "session_hash",
        sessionHash: HashUtil.byCrypto(options.sessionNumber),
      });

      if (updatedId === undefined) throw getUpdateErr();

      return updatedId;
    } catch (err) {
      if (err instanceof DbAccess.ErrorClass) throw err;

      throw getUpdateErr(err);
    }
  }

  /**
   * Invalidate the provided token string if found in the database by
   * setting the `isUsed` field to `true`.
   * @param options
   */
  private async invalidateToken(options: {
    tx: TxContext;
    oldToken: string;
  }): Promise<void> {
    try {
      await this._sessionTokenRepository.execUpdate({
        dbOrTx: options.tx,
        fn: async (update, converter) => {
          const where = converter({
            tokenHash: HashUtil.byCrypto(options.oldToken),
          });
          return await update.set({ isUsed: true }).where(where);
        },
      });
    } catch (err) {
      throw new DbAccess.ErrorClass({
        name: "DB_ACCESS_UPDATE_ERROR",
        message: "Faield invalidating previous refresh token.",
        cause: err,
      });
    }
  }

  /**
   * Get the stored tokens in the database matching the provided hash.
   * If one of them has the `isUsed` field set to `true`, throw an error.
   * @param options
   */
  private async ensureTokenUnused(options: {
    tx: TxContext;
    tknHash: string;
  }): Promise<void> {
    const usedToken = await this._sessionTokenRepository.execQuery({
      fn: async (query, converter) => {
        const where = converter({
          filterType: "and",
          tokenHash: options.tknHash,
          isUsed: true,
        });
        return await query.findFirst({ where });
      },
    });

    //  todo: add fallback behavior to this (delete/logout all sessions)
    if (usedToken !== undefined)
      throw new Session.ErrorClass({
        name: "SESSION_TOKEN_REUSE_ERROR",
        message: "Token is already used.",
      });
  }

  private async queryTokens<T>(args: QueryArgs.SessionToken<T>) {
    try {
      return await this._sessionTokenRepository.execQuery(args);
    } catch (err) {
      throw DbAccess.normalizeError({
        name: "DB_ACCESS_QUERY_ERROR",
        message: "Failed checking refresh tokens.",
        err,
      });
    }
  }

  /**
   * @description Create a new `SessionToken` object and insert it to the
   * `session_tokens` table.
   * @param options
   */
  private async storeNewTkn(options: {
    tx: TxContext;
    sessionId: number;
    tokenHash: string;
  }) {
    const getInsertErr = (cause?: unknown) => {
      return new DbAccess.ErrorClass({
        name: "DB_ACCESS_INSERT_ERROR",
        message: "Failed to store new token.",
        cause,
      });
    };

    try {
      const newTknId = await this._sessionTokenRepository.execInsert({
        dbOrTx: options.tx,
        fn: async (insert) => {
          return await insert
            .values({
              ...options,
              createdAt: new Date().toISOString(),
            })
            .onConflictDoNothing()
            .returning()
            .then((result) => result[0]);
        },
      });

      if (newTknId === undefined) throw getInsertErr();
    } catch (err) {
      if (err instanceof DbAccess.ErrorClass) throw err;

      throw getInsertErr(err);
    }
  }
  //#endregion
}
