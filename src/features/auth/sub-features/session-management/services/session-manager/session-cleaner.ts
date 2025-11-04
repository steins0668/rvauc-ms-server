import { HashUtil, ResultBuilder } from "../../../../../../utils";
import { Core } from "../../../../core";
import { Repositories } from "../../../../services";

export class SessionCleaner {
  private readonly _userSessionRepository: Repositories.UserSession;

  constructor(userSessionTokenRepository: Repositories.UserSession) {
    this._userSessionRepository = userSessionTokenRepository;
  }

  /**
   * @public
   * @async
   * @function tryEndSession
   * @description Asynchronously attempts to end a session with the hash of a
   * specified `sessionNumber`.
   * @param sessionNumber The `sessionNumber` of the session that will be deleted.
   * @returns A `Promise` resolving to the `id` of the deleted session, or `null` if the
   * operation fails.
   */
  public async endSession(
    sessionNumber: string
  ): Promise<
    | Core.Types.AuthenticationResult.Success<number | undefined>
    | Core.Types.AuthenticationResult.Fail
  > {
    try {
      const deleteResult = await this._userSessionRepository.delete({
        scope: "user_session",
        sessionNumberHash: HashUtil.byCrypto(sessionNumber),
      });

      const deletedId = deleteResult[0];

      return ResultBuilder.success(deletedId, "AUTHENTICATION_SESSION_END");
    } catch (err) {
      const error: Core.Errors.Authentication.ErrorClass = {
        name: "AUTHENTICATION_SESSION_CLEANUP_ERROR",
        message: "Failed deleting session. Please try again later.",
        cause: err,
      };

      return ResultBuilder.fail(error);
    }
  }
  /**
   * @public
   * @async
   * @function endIdleSessions
   * @description Asynchronously ends/deletes idle sessions in the database.
   * @returns A `Promise` that resolves to an array of `number`s representing
   * the deleted session ids or `null` if the delete operation fails.
   */
  public async endIdleSessions(): Promise<
    | Core.Types.AuthenticationResult.Success<number[]>
    | Core.Types.AuthenticationResult.Fail
  > {
    try {
      const deletedSessionIds = await this._userSessionRepository.delete({
        scope: "idle_session",
      });

      return ResultBuilder.success(
        deletedSessionIds,
        "AUTHENTICATION_SESSION_END"
      );
    } catch (err) {
      const error: Core.Errors.Authentication.ErrorClass = {
        name: "AUTHENTICATION_SESSION_CLEANUP_ERROR",
        message: "Failed deleting idle sessions.",
        cause: err,
      };
      return ResultBuilder.fail(error);
    }
  }

  /**
   * @public
   * @async
   * @function endExpiredSessions
   * @description Asynchronously ends/deletes all expired sessions in the
   * database.
   * @returns A `Promise` that resolves to an array of `number`s representing
   * the deleted session ids or `null` if the delete operation fails.
   */
  public async endExpiredSessions(): Promise<
    | Core.Types.AuthenticationResult.Success<number[]>
    | Core.Types.AuthenticationResult.Fail
  > {
    try {
      const deletedSessionIds = await this._userSessionRepository.delete({
        scope: "expired_persistent",
      });

      return ResultBuilder.success(
        deletedSessionIds,
        "AUTHENTICATION_SESSION_END"
      );
    } catch (err) {
      const error: Core.Errors.Authentication.ErrorClass = {
        name: "AUTHENTICATION_SESSION_CLEANUP_ERROR",
        message: "Failed deleting idle sessions.",
        cause: err,
      };
      return ResultBuilder.fail(error);
    }
  }
}
