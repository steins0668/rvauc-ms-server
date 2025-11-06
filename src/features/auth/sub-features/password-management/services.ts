import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { BaseResult } from "../../../../types";
import { HashUtil, ResultBuilder } from "../../../../utils";
import { Core } from "../../core";
import { Repositories } from "../../repositories";
import { Repository, ViewModels } from "../../types";

export namespace Services {
  export namespace PasswordManagement {
    export async function createService() {
      const dbContext = await createContext();
      const passwordResetTokenRepo = new Repositories.PasswordResetCode(
        dbContext
      );
      const userRepo = new Repositories.User(dbContext);
      return new Service(passwordResetTokenRepo, userRepo);
    }

    export class Service {
      private readonly _passwordResetTokenRepo: Repositories.PasswordResetCode;
      private readonly _userRepo: Repositories.User;

      constructor(
        passwordResetTokenRepo: Repositories.PasswordResetCode,
        userRepo: Repositories.User
      ) {
        this._passwordResetTokenRepo = passwordResetTokenRepo;
        this._userRepo = userRepo;
      }

      public async updatePassword(args: {
        dbOrTx?: DbOrTx | undefined;
        tokenId: number;
        userId: number;
        password: string;
      }): Promise<
        | Core.Types.AuthenticationResult.Success<ViewModels.User>
        | Core.Types.AuthenticationResult.Fail
      > {
        const failResult = (err?: unknown) =>
          ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_PASSWORD_UPDATE_ERROR",
              message: "Failed updating password",
              err,
            })
          );

        try {
          const updated = await this._userRepo.execUpdate({
            dbOrTx: args.dbOrTx,
            fn: async (update, converter) => {
              const passwordHash = HashUtil.byCrypto(args.password);
              return await update
                .set({ passwordHash })
                .where(converter({ id: args.userId }))
                .returning()
                .then((result) => result[0]);
            },
          });

          if (updated === undefined) return failResult();

          return ResultBuilder.success(updated);
        } catch (err) {
          return failResult(err);
        }
      }

      public async invalidateCode(args: {
        dbOrTx?: DbOrTx | undefined;
        tokenId: number;
      }) {
        const update = await this.updateCodeWhere({
          dbOrTx: args.dbOrTx,
          values: { isUsed: true, expiresAt: new Date().toISOString() },
          filter: { id: args.tokenId, isUsed: false },
        });

        if (!update.success)
          return ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_UPDATE_ERROR",
              message: "Failed invalidating token.",
              err: update.error,
            })
          );

        return ResultBuilder.success(update.result);
      }

      /**
       * @description queries the db for an unused token with the given hash.
       * ! note that there is only ever one unused token.
       * @param req
       * @returns
       */
      public async verifyResetCode(
        tokenHash: string
      ): Promise<
        | Core.Types.AuthenticationResult.Success<ViewModels.PasswordResetCode>
        | Core.Types.AuthenticationResult.Fail
      > {
        const query = await this.findCodeWhereStrict({
          filter: { tokenHash, isUsed: false },
        });

        if (!query.success)
          return ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
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
            new Core.Errors.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_EXPIRED_ERROR",
              message: "Token is already expired",
            })
          );

        return ResultBuilder.success(query.result);
      }

      public async verifyNoActiveCode(userId: number) {
        const query = await this.findCodeWhere({
          filter: { userId, isUsed: false },
        });

        if (!query.success)
          return ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
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
            const deletion = await this.deleteCodeWhere({
              filter: { id: result.id },
            });

            if (!deletion.success)
              //  ! propagate db delete error
              return ResultBuilder.fail(
                Core.Errors.Authentication.normalizeError({
                  name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_DELETE_ERROR",
                  message: "Failed to remove unused expired token.",
                  err: deletion.error,
                })
              );
          }
          return ResultBuilder.success(isExpired); //  * expired token means no active tokens.
        } else return ResultBuilder.success(true); //  * no active tokens. return true
      }

      public async storeNewCode(
        userId: number,
        tokenHash: string
      ): Promise<
        | Core.Types.AuthenticationResult.Success<ViewModels.PasswordResetCode>
        | Core.Types.AuthenticationResult.Fail
      > {
        const now = new Date();
        const expiry = new Date();
        expiry.setMinutes(now.getMinutes() + 10);

        const insertion = await this.insertResetCode({
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
            new Core.Errors.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_CREATION_ERROR",
              message: "Failed to store password reset token",
            })
          );

        return insertion.success
          ? ResultBuilder.success(
              insertion.result as ViewModels.PasswordResetCode
            )
          : ResultBuilder.fail(
              Core.Errors.Authentication.normalizeError({
                name: "AUTHENTICATION_PASSWORD_RESET_TOKEN_CREATION_ERROR",
                message: "Failed to store password reset token.",
                err: insertion.error,
              })
            );
      }

      //#region Wrappers
      public async insertResetCode<T>(
        args: Repository.InsertArgs.PasswordResetCode<T>
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

      public async findCodeWhereStrict(args: {
        dbOrTx?: DbOrTx;
        filter: Repository.QueryFilters.PasswordResetCode;
      }) {
        const query = await this.findCodeWhere(args);

        if (query.success && query.result === undefined)
          return ResultBuilder.fail(
            new DbAccess.ErrorClass({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed finding reset token.",
            })
          );

        return query as
          | BaseResult.Success<ViewModels.PasswordResetCode>
          | BaseResult.Fail<DbAccess.ErrorClass>;
      }

      public async findCodeWhere(args: {
        dbOrTx?: DbOrTx;
        filter: Repository.QueryFilters.PasswordResetCode;
      }) {
        return await this.queryResetCode({
          dbOrTx: args.dbOrTx,
          fn: async (query, converter) => {
            return await query.findFirst({ where: converter(args.filter) });
          },
        });
      }

      public async queryResetCode<T>(
        args: Repository.QueryArgs.PasswordResetCode<T>
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
      public async updateCodeWhere(args: {
        dbOrTx?: DbOrTx | undefined;
        values: Partial<ViewModels.PasswordResetCode>;
        filter: Repository.QueryFilters.PasswordResetCode;
      }) {
        return await this.updateResetCode({
          dbOrTx: args.dbOrTx,
          fn: async (update, converter) => {
            return await update
              .set(args.values)
              .where(converter(args.filter))
              .returning();
          },
        });
      }

      /**
       * @description Wrapper for `execUpdate` that integrates result objects to the return type.
       * @param args
       * @returns
       */
      public async updateResetCode<T>(
        args: Repository.UpdateArgs.PasswordResetCode<T>
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
      public async deleteCodeWhere(args: {
        dbOrTx?: DbOrTx;
        filter: Repository.QueryFilters.PasswordResetCode;
      }) {
        return await this.deleteResetCode({
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
      public async deleteResetCode<T>(
        args: Repository.DeleteArgs.PasswordResetCode<T>
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
