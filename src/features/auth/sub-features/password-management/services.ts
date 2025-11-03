import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { BaseResult } from "../../../../types";
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

      /**
       * @description queries the db for an unused token with the given hash.
       * ! note that there is only ever one unused token.
       * @param req
       * @returns
       */
      public async verifyResetToken(
        tokenHash: string
      ): Promise<
        | AuthenticationResult.Success<ViewModels.PasswordResetToken>
        | AuthenticationResult.Fail
      > {
        const query = await this.findTokenWhereStrict({
          filter: { tokenHash, isUsed: false },
        });

        if (!query.success)
          return ResultBuilder.fail(
            AuthError.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_QUERY_ERROR",
              message: "Failed querying tokens.",
              err: query.error,
            })
          );

        const now = new Date().getTime();
        const expiry = new Date(query.result.expiresAt).getTime();
        const isExpired = now > expiry;

        if (isExpired)
          return ResultBuilder.fail(
            new AuthError.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_EXPIRED_ERROR",
              message: "Token is already expired",
            })
          );

        return ResultBuilder.success(query.result);
      }

      public async verifyNoActiveToken(userId: number) {
        const query = await this.findTokenWhere({
          filter: { userId, isUsed: false },
        });

        if (!query.success)
          return ResultBuilder.fail(
            AuthError.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_QUERY_ERROR",
              message: "Failed querying reset tokens.",
              err: query.error,
            })
          ); //  ! something went wrong with the query. propagate failure(query error)

        const { result } = query;
        if (result) {
          const now = new Date().getTime();
          const expiry = new Date(result.expiresAt).getTime();
          const isExpired = expiry <= now;

          if (isExpired) {
            const deletion = await this.deleteTokenWhere({
              filter: { id: result.id },
            });

            if (!deletion.success)
              //  ! propagate db delete error
              return ResultBuilder.fail(
                AuthError.Authentication.normalizeError({
                  name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_DELETE_ERROR",
                  message: "Failed to remove unused expired token.",
                  err: deletion.error,
                })
              );
          }
          return ResultBuilder.success(isExpired); //  * expired token means no active tokens.
        } else return ResultBuilder.success(true); //  * no active tokens. return true
      }

      public async storeNewToken(
        userId: number,
        tokenHash: string
      ): Promise<
        | AuthenticationResult.Success<ViewModels.PasswordResetToken>
        | AuthenticationResult.Fail
      > {
        const now = new Date();
        const expiry = new Date();
        expiry.setMinutes(now.getMinutes() + 10);

        const insertion = await this.insertResetToken({
          fn: async (insert) => {
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

        if (insertion.success && insertion.result === undefined)
          return ResultBuilder.fail(
            new AuthError.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_CREATION_ERROR",
              message: "Failed to store password reset token",
            })
          );

        return insertion.success
          ? ResultBuilder.success(
              insertion.result as ViewModels.PasswordResetToken
            )
          : ResultBuilder.fail(
              AuthError.Authentication.normalizeError({
                name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_CREATION_ERROR",
                message: "Failed to store password reset token.",
                err: insertion.error,
              })
            );
      }

      //#region Wrappers
      public async insertResetToken<T>(
        args: RepositoryTypes.InsertArgs.PasswordResetToken<T>
      ) {
        try {
          const result = await this._passwordResetTokenRepo.execInsert(args);
          return ResultBuilder.success(result);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_INSERT_ERROR",
              message: "Failed inserting reset token.",
              err,
            })
          );
        }
      }

      public async findTokenWhereStrict(args: {
        dbOrTx?: DbOrTx;
        filter: RepositoryTypes.QueryFilters.PasswordResetToken;
      }) {
        const query = await this.findTokenWhere(args);

        if (query.success && query.result === undefined)
          return ResultBuilder.fail(
            new DbAccess.ErrorClass({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed finding reset token.",
            })
          );

        return query as
          | BaseResult.Success<ViewModels.PasswordResetToken>
          | BaseResult.Fail<DbAccess.ErrorClass>;
      }

      public async findTokenWhere(args: {
        dbOrTx?: DbOrTx;
        filter: RepositoryTypes.QueryFilters.PasswordResetToken;
      }) {
        return await this.queryResetToken({
          dbOrTx: args.dbOrTx,
          fn: async (query, converter) => {
            return await query.findFirst({ where: converter(args.filter) });
          },
        });
      }

      public async queryResetToken<T>(
        args: RepositoryTypes.QueryArgs.PasswordResetToken<T>
      ) {
        try {
          const queried = await this._passwordResetTokenRepo.execQuery(args);

          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_QUERY_ERROR",
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
          dbOrTx: args.dbOrTx,
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
      ) {
        try {
          const deletion = await this._passwordResetTokenRepo.execDelete(args);

          return ResultBuilder.success(deletion);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_DELETE_ERROR",
              message: `Failed deleting reset token/s.`,
              err,
            })
          );
        }
      }
      //#endregion
    }
  }
}
