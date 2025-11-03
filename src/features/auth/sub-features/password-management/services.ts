import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { ResultBuilder } from "../../../../utils";
import { AuthError } from "../../error";
import { Repositories } from "../../services";
import { AuthenticationResult, RepositoryTypes, ViewModels } from "../../types";

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
        | AuthenticationResult.Success<ViewModels.PasswordResetToken>
        | AuthenticationResult.Fail
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
            stored,
            "AUTHENTICATION_PASSWORD_RESET_CREATE_TOKEN"
          );
        } catch (err) {
          return fail(err);
        }
      }

      public async queryResetTokenStrict(
        args: Partial<ViewModels.PasswordResetToken>
      ): Promise<
        | AuthenticationResult.Success<ViewModels.PasswordResetToken>
        | AuthenticationResult.Fail
      > {
        const query = await this.queryResetToken(args);

        if (query.success && query.result === undefined) {
          return ResultBuilder.fail(
            new AuthError.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_NOT_FOUND_ERROR",
              message: "Could not find token.",
            })
          );
        }

        return query as
          | AuthenticationResult.Success<ViewModels.PasswordResetToken>
          | AuthenticationResult.Fail;
      }

      public async queryResetToken(
        args: Partial<ViewModels.PasswordResetToken>
      ): Promise<
        | AuthenticationResult.Success<
            ViewModels.PasswordResetToken | undefined
          >
        | AuthenticationResult.Fail
      > {
        try {
          const queried = await this._passwordResetTokenRepo.execQuery({
            fn: async (query, converter) => {
              const where = converter(args);
              return await query.findFirst({ where });
            },
          });

          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            AuthError.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_QUERY_ERROR",
              message: "Failed querying password_reset_tokens table.",
              err,
            })
          );
        }
      }

      /**
       * @description Wrapper for `updateResetToken` to remove implementation
       * boilerplate by directly passing a value and filter for the where clause.
       * @param dbOrTx
       * @param values
       * @param filter
       * @returns
       */
      public async updateTokenWhere(args: {
        dbOrTx?: DbOrTx;
        values: Partial<ViewModels.PasswordResetToken>;
        filter: RepositoryTypes.QueryFilters.PasswordResetToken;
      }) {
        return await this.updateResetToken({
          fn: async (update, converter) => {
            return await update.set(args.values).where(converter(args.filter));
          },
        });
      }

      /**
       * @description Wrapper for `execUpdate` that integrates result objects to the return type.
       * @param args
       * @returns
       */
      public async updateResetToken<T>(
        args: RepositoryTypes.UpdateArgs.PasswordResetToken<T>
      ) {
        try {
          const update = await this._passwordResetTokenRepo.execUpdate(args);
          return ResultBuilder.success(update);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_UPDATE_ERROR",
              message: "Failed updating reset token",
              err,
            })
          );
        }
      }

      /**
       * @description Wrapper for `deleteResetToken` to remove implementation
       * boilerplate by directly passing a filter for the where clause.
       * @param dbOrTx
       * @param filter
       * @returns
       */
      public async deleteTokenWhere(args: {
        dbOrTx?: DbOrTx;
        filter: RepositoryTypes.QueryFilters.PasswordResetToken;
      }) {
        return await this.deleteResetToken({
          dbOrTx: args.dbOrTx,
          fn: async (deleteBase, converter) => {
            return await deleteBase.where(converter(args.filter));
          },
        });
      }

      /**
       * @description Wrapper for `execDelete` that integrates result objects to the return type.
       * @param args
       * @returns
       */
      public async deleteResetToken<T>(
        args: RepositoryTypes.DeleteArgs.PasswordResetToken<T>
      ): Promise<AuthenticationResult.Success<T> | AuthenticationResult.Fail> {
        try {
          const deletion = await this._passwordResetTokenRepo.execDelete(args);

          return ResultBuilder.success(deletion);
        } catch (err) {
          return ResultBuilder.fail(
            AuthError.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_DELETE_ERROR",
              message: `Failed deleting reset token/s.`,
              err,
            })
          );
        }
      }
    }
  }
}
