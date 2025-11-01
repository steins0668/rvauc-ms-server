import { createContext } from "../../../../db/create-context";
import { ResultBuilder } from "../../../../utils";
import { AuthError } from "../../error";
import { Repositories } from "../../services";
import { AuthenticationResult } from "../../types";

export namespace Services {
  export namespace PasswordManagement {
    export async function createService() {
      const dbContext = await createContext();
      const passwordResetTokenRepo = new Repositories.PasswordResetToken(
        dbContext
      );
      return new Service(passwordResetTokenRepo);
    }

    export class Service {
      private readonly _passwordResetTokenRepo: Repositories.PasswordResetToken;

      constructor(passwordResetTokenRepo: Repositories.PasswordResetToken) {
        this._passwordResetTokenRepo = passwordResetTokenRepo;
      }

      public async storeResetToken(
        userId: number,
        tokenHash: string
      ): Promise<
        AuthenticationResult.Success<string> | AuthenticationResult.Fail
      > {
        const fail = (err?: unknown) =>
          ResultBuilder.fail(
            AuthError.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_CREATION_ERROR",
              message: "Failed to store password reset token",
              err,
            })
          );

        try {
          const stored = await this._passwordResetTokenRepo.execInsert({
            fn: async (insert) => {
              const now = new Date();
              const expiry = new Date();
              expiry.setMinutes(now.getMinutes() + 10);

              return await insert
                .values({
                  userId,
                  tokenHash,
                  createdAt: now.toISOString(),
                  expiresAt: expiry.toISOString(),
                })
                .onConflictDoNothing()
                .returning()
                .then((result) => result[0]);
            },
          });

          if (stored === undefined) return fail();

          return ResultBuilder.success(
            tokenHash,
            "AUTHENTICATION_PASSWORD_RESET_CREATE_TOKEN"
          );
        } catch (err) {
          return fail(err);
        }
      }

      public async deleteResetToken(
        id: number
      ): Promise<
        | AuthenticationResult.Success<number | undefined>
        | AuthenticationResult.Fail
      > {
        try {
          const deleted = await this._passwordResetTokenRepo.execDelete({
            fn: async (deleteBase, converter) => {
              const where = converter({ id });
              return await deleteBase
                .where(where)
                .returning()
                .then((result) => result[0]);
            },
          });

          return ResultBuilder.success(deleted?.id);
        } catch (err) {
          return ResultBuilder.fail(
            AuthError.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_DELETE_ERROR",
              message: `Failed deleteing reset token with id ${id}`,
              err,
            })
          );
        }
      }
    }
  }
}
