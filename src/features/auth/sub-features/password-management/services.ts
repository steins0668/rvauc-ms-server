import bcrypt from "bcrypt";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { BaseResult } from "../../../../types";
import { ResultBuilder } from "../../../../utils";
import { Core } from "../../core";
import { Repositories } from "../../repositories";
import { Repository, ViewModels } from "../../types";

export namespace Services {
  export namespace PasswordManagement {
    export async function createService() {
      const dbContext = await createContext();
      const passwordResetCodeRepo = new Repositories.PasswordResetCode(
        dbContext
      );
      const userRepo = new Repositories.User(dbContext);
      return new Service(passwordResetCodeRepo, userRepo);
    }

    export class Service {
      private readonly _passwordResetCodeRepo: Repositories.PasswordResetCode;
      private readonly _userRepo: Repositories.User;

      constructor(
        passwordResetCodeRepo: Repositories.PasswordResetCode,
        userRepo: Repositories.User
      ) {
        this._passwordResetCodeRepo = passwordResetCodeRepo;
        this._userRepo = userRepo;
      }

      public async updatePassword(args: {
        dbOrTx?: DbOrTx | undefined;
        codeId: number;
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
              const passwordHash = await bcrypt.hash(args.password, 10);
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
        codeId: number;
      }) {
        const update = await this.updateCodeWhere({
          dbOrTx: args.dbOrTx,
          values: { isUsed: true, expiresAt: new Date().toISOString() },
          filter: { filterType: "and", id: args.codeId, isUsed: false },
        });

        if (!update.success)
          return ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_CODE_UPDATE_ERROR",
              message: "Failed invalidating code.",
              err: update.error,
            })
          );

        return ResultBuilder.success(update.result);
      }

      /**
       * @description queries the db for an unused code with the given hash.
       * ! note that there is only ever one unused code.
       * @param req
       * @returns
       */
      public async verifyResetCode(
        codeHash: string
      ): Promise<
        | Core.Types.AuthenticationResult.Success<ViewModels.PasswordResetCode>
        | Core.Types.AuthenticationResult.Fail
      > {
        const query = await this.findCodeWhereStrict({
          filter: { codeHash },
        });

        if (!query.success)
          return ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR",
              message: "Failed querying codes.",
              err: query.error,
            })
          );

        if (query.result.isUsed)
          return ResultBuilder.fail(
            new Core.Errors.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_CODE_ALREADY_USED_ERROR",
              message: "Code is already used.",
            })
          );

        const now = new Date().getTime();
        const expiry = new Date(query.result.expiresAt).getTime();
        const isExpired = now > expiry;

        if (isExpired)
          return ResultBuilder.fail(
            new Core.Errors.Authentication.ErrorClass({
              name: "AUTHENTICATION_PASSWORD_RESET_CODE_EXPIRED_ERROR",
              message: "Code is already expired.",
            })
          );

        return ResultBuilder.success(query.result);
      }

      public async verifyNoActiveCode(userId: number) {
        const query = await this.findCodeWhere({
          filter: { filterType: "and", userId, isUsed: false },
        });

        if (!query.success)
          return ResultBuilder.fail(
            Core.Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_PASSWORD_RESET_CODE_QUERY_ERROR",
              message: "Failed querying reset codes.",
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
                  name: "AUTHENTICATION_PASSWORD_RESET_CODE_DELETE_ERROR",
                  message: "Failed to remove unused expired code.",
                  err: deletion.error,
                })
              );
          }
          return ResultBuilder.success(isExpired); //  * expired code means no active code.
        } else return ResultBuilder.success(true); //  * no active codes. return true
      }

      public async storeNewCode(
        userId: number,
        codeHash: string
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
                codeHash,
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
              name: "AUTHENTICATION_PASSWORD_RESET_CODE_CREATION_ERROR",
              message: "Failed to store password reset code",
            })
          );

        return insertion.success
          ? ResultBuilder.success(
              insertion.result as ViewModels.PasswordResetCode
            )
          : ResultBuilder.fail(
              Core.Errors.Authentication.normalizeError({
                name: "AUTHENTICATION_PASSWORD_RESET_CODE_CREATION_ERROR",
                message: "Failed to store password reset code.",
                err: insertion.error,
              })
            );
      }

      //#region Wrappers
      public async insertResetCode<T>(
        args: Repository.InsertArgs.PasswordResetCode<T>
      ) {
        try {
          const result = await this._passwordResetCodeRepo.execInsert(args);
          return ResultBuilder.success(result);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_INSERT_ERROR",
              message: "Failed inserting reset code.",
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
              message: "Failed finding reset code.",
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
          const queried = await this._passwordResetCodeRepo.execQuery(args);

          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed querying password_reset_codes table.",
              err,
            })
          );
        }
      }

      /**
       * @description Wrapper for `updateResetCode` to remove implementation
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
          const update = await this._passwordResetCodeRepo.execUpdate(args);
          return ResultBuilder.success(update);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_UPDATE_ERROR",
              message: "Failed updating reset code",
              err,
            })
          );
        }
      }

      /**
       * @description Wrapper for `deleteResetCode` to remove implementation
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
          const deletion = await this._passwordResetCodeRepo.execDelete(args);

          return ResultBuilder.success(deletion);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_DELETE_ERROR",
              message: `Failed deleting reset code/s.`,
              err,
            })
          );
        }
      }
      //#endregion
    }
  }
}
