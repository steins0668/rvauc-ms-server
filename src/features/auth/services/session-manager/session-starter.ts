import { randomUUID } from "crypto";
import { TxContext } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { HashUtil, ResultBuilder } from "../../../../utils";
import { AuthError } from "../../error";
import { SessionResult } from "../../types";
import { Repositories } from "../repositories";

/**
 * @class
 * @description Handles user session management from starting sessions, modifying
 * existing sessions, as well as ending sessions.
 */
export class SessionStarter {
  private readonly _sessionTokenRepository: Repositories.SessionToken;
  private readonly _userSessionRepository: Repositories.UserSession;

  public constructor(
    sessionTokenRepository: Repositories.SessionToken,
    userSessionRepository: Repositories.UserSession
  ) {
    this._sessionTokenRepository = sessionTokenRepository;
    this._userSessionRepository = userSessionRepository;
  }

  //  todo: add docs
  public async newSession(sessionData: {
    userId: number;
    sessionNumber: string;
    refreshToken: string;
    expiresAt?: Date | null;
  }): Promise<
    SessionResult.Success<string, "SESSION_START"> | SessionResult.Fail
  > {
    const {
      userId,
      sessionNumber,
      refreshToken,
      expiresAt = null,
    } = sessionData;

    try {
      const result = await this._userSessionRepository.execTransaction(
        async (tx) => {
          const sessionId = await this.createSession({
            tx,
            sessionNumber,
            userId,
            expiresAt,
          });

          //  store first refresh token
          await this.storeRefreshTkn({ tx, sessionId, refreshToken });

          return sessionNumber;
        }
      );

      return ResultBuilder.success(result, "SESSION_START");
    } catch (err) {
      const error = AuthError.Authentication.normalizeError({
        name: "AUTHENTICATION_SESSION_START_ERROR",
        message:
          "An error occured while creating session. Please try again later.",
        err,
      });

      return ResultBuilder.fail(error);
    }
  }

  //#region newSession helpers
  /**
   * @description Create a `UserSession` object and insert it to the `user_sessions`
   * table.
   * @param args
   * @returns
   */
  private async createSession(args: {
    tx: TxContext;
    sessionNumber: string;
    userId: number;
    expiresAt?: Date | null;
  }): Promise<number> {
    const { tx, userId, sessionNumber, expiresAt } = args;

    const now = new Date();
    const nowISO = now.toISOString();
    //  create session
    const sessionId = await this._userSessionRepository.insertOne({
      dbOrTx: tx,
      userSession: {
        userId,
        sessionHash: HashUtil.byCrypto(sessionNumber),
        createdAt: nowISO,
        lastUsedAt: nowISO,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });

    if (sessionId === undefined)
      throw new DbAccess.ErrorClass({
        name: "DB_ACCESS_INSERT_ERROR",
        message: "Failed storing session to database.",
      });

    return sessionId;
  }

  /**
   * @public
   * @function generateSessionNumber
   * @description Generates a session number for the provided `userId`.
   * Uses the `userId`, current date and a random generated `UUID`.
   * @param userId The `id` of the user.
   * @returns A string representing the generated session number.
   */
  public generateSessionNumber(userId: number): string {
    const sessionNumber = `${userId}-${Date.now()}-${randomUUID()}`;
    return sessionNumber;
  }

  /**
   * @description Create a `SessionToken` object and insert it to the
   * `session_tokens` table.
   * @param tx
   * @param args
   */
  private async storeRefreshTkn(args: {
    tx: TxContext;
    sessionId: number;
    refreshToken: string;
  }): Promise<void> {
    const { tx, sessionId, refreshToken } = args;

    const tknId = await this._sessionTokenRepository.execInsert({
      dbOrTx: tx,
      fn: async (insert) => {
        return await insert
          .values({
            sessionId,
            tokenHash: HashUtil.byCrypto(refreshToken),
            createdAt: new Date().toISOString(),
          })
          .onConflictDoNothing()
          .returning()
          .then((result) => result[0]);
      },
    });

    if (tknId === undefined)
      throw new DbAccess.ErrorClass({
        name: "DB_ACCESS_INSERT_ERROR",
        message: "Failed storing refresh token to database.",
      });
  }
  //#endregion
}
