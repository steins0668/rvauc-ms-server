import { createContext, DbOrTx } from "../../../../../db/create-context";
import { DbAccess } from "../../../../../error";
import { BaseResult } from "../../../../../types";
import { ResultBuilder } from "../../../../../utils";
import { Repositories } from "../../../repositories";
import { Repository, ViewModels } from "../../../types";

export namespace SignInRequest {
  export async function createService() {
    const context = await createContext();
    const signInRequestRepo = new Repositories.SignInRequest(context);
    return new Service(signInRequestRepo);
  }

  export class Service {
    private readonly _signInRequestRepo: Repositories.SignInRequest;

    constructor(signInRequestRepo: Repositories.SignInRequest) {
      this._signInRequestRepo = signInRequestRepo;
    }

    public async insertRequest<T>(
      args: Repository.InsertArgs.SignInRequest<T>
    ) {
      try {
        const result = await this._signInRequestRepo.execInsert(args);
        return ResultBuilder.success(result);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_INSERT_ERROR",
            message: "Failed inserting sign-in request.",
            err,
          })
        );
      }
    }

    public async findRequestWhereStrict(args: {
      dbOrTx?: DbOrTx;
      filter: Repository.QueryFilters.SignInRequest;
    }) {
      const query = await this.findRequestWhere(args);

      if (query.success && query.result === undefined)
        return ResultBuilder.fail(
          new DbAccess.ErrorClass({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Failed finding sign-in request.",
          })
        );

      return query as
        | BaseResult.Success<ViewModels.SignInRequest>
        | BaseResult.Fail<DbAccess.ErrorClass>;
    }

    public async findRequestWhere(args: {
      dbOrTx?: DbOrTx;
      filter: Repository.QueryFilters.SignInRequest;
    }) {
      return await this.queryRequest({
        dbOrTx: args.dbOrTx,
        fn: async (query, converter) => {
          return await query.findFirst({ where: converter(args.filter) });
        },
      });
    }

    public async queryRequest<T>(args: Repository.QueryArgs.SignInRequest<T>) {
      try {
        const queried = await this._signInRequestRepo.execQuery(args);
        return ResultBuilder.success(queried);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Failed querying sign_in_requests table.",
            err,
          })
        );
      }
    }

    /**
     * @description Wrapper for `updateRequest` to remove implementation
     * boilerplate by directly passing a value and filter for the where clause.
     * @param dbOrTx
     * @param values
     * @param filter
     * @returns
     */
    public async updateRequestWhere(args: {
      dbOrTx?: DbOrTx | undefined;
      values: Partial<ViewModels.SignInRequest>;
      filter: Repository.QueryFilters.SignInRequest;
    }) {
      return await this.updateRequest({
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
    public async updateRequest<T>(
      args: Repository.UpdateArgs.SignInRequest<T>
    ) {
      try {
        const update = await this._signInRequestRepo.execUpdate(args);
        return ResultBuilder.success(update);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_UPDATE_ERROR",
            message: "Failed updating sign-in request",
            err,
          })
        );
      }
    }

    /**
     * @description Wrapper for `deleteRequest` to remove implementation
     * boilerplate by directly passing a filter for the where clause.
     * @param dbOrTx
     * @param filter
     * @returns
     */
    public async deleteRequestWhere(args: {
      dbOrTx?: DbOrTx;
      filter: Repository.QueryFilters.SignInRequest;
    }) {
      return await this.deleteRequest({
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
    public async deleteRequest<T>(
      args: Repository.DeleteArgs.SignInRequest<T>
    ) {
      try {
        const deletion = await this._signInRequestRepo.execDelete(args);

        return ResultBuilder.success(deletion);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_DELETE_ERROR",
            message: `Failed deleting sign-in request/s.`,
            err,
          })
        );
      }
    }
  }
}
