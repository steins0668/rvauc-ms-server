import { ResultSet } from "@libsql/client/.";
import {
  SQLiteDeleteBase,
  SQLiteInsertBuilder,
  SQLiteUpdateBuilder,
} from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { Repositories } from "../repositories";
import { Db } from "./db.type";

export namespace Repository {
  type AnyFunc = (...args: any[]) => any;

  export namespace DeleteArgs {
    type BaseDeleteArgs<
      TDeleteBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet,
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        deleteBase: TDeleteBuilder,
        filterConverter: TFilterConverter,
      ) => Promise<TResult>;
    };

    export type ViolationRecord<T> = BaseDeleteArgs<
      SQLiteDeleteBase<Db.Tables.ViolationRecord, "async", ResultSet>,
      Repositories.ViolationRecord["buildWhereClause"],
      T
    >;

    export type ViolationStatus<T> = BaseDeleteArgs<
      SQLiteDeleteBase<Db.Tables.ViolationStatus, "async", ResultSet>,
      Repositories.ViolationStatus["buildWhereClause"],
      T
    >;
  }

  export namespace InsertArgs {
    type BaseInsertArgs<
      TInsertBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet,
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        insert: TInsertBuilder,
        filterConverter: TFilterConverter,
      ) => Promise<TResult>;
    };

    export type ViolationRecord<T> = BaseInsertArgs<
      SQLiteInsertBuilder<Db.Tables.ViolationRecord, "async", ResultSet>,
      Repositories.ViolationRecord["buildWhereClause"],
      T
    >;

    export type ViolationStatus<T> = BaseInsertArgs<
      SQLiteInsertBuilder<Db.Tables.ViolationStatus, "async", ResultSet>,
      Repositories.ViolationStatus["buildWhereClause"],
      T
    >;
  }

  export namespace UpdateArgs {
    type BaseUpdateArgs<
      TUpdateBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet,
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        update: TUpdateBuilder,
        filterConverter: TFilterConverter,
      ) => Promise<TResult>;
    };

    export type ViolationRecord<T> = BaseUpdateArgs<
      SQLiteUpdateBuilder<Db.Tables.ViolationRecord, "async", ResultSet>,
      Repositories.ViolationRecord["buildWhereClause"],
      T
    >;

    export type ViolationStatus<T> = BaseUpdateArgs<
      SQLiteUpdateBuilder<Db.Tables.ViolationStatus, "async", ResultSet>,
      Repositories.ViolationStatus["buildWhereClause"],
      T
    >;
  }

  export namespace QueryArgs {
    type BaseQueryArgs<
      TRelationalQueryBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet,
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        query: TRelationalQueryBuilder,
        filterConverter: TFilterConverter,
      ) => Promise<TResult>;
    };

    export type ViolationRecord<T> = BaseQueryArgs<
      DbContext["query"]["violationRecords"],
      Repositories.ViolationRecord["buildWhereClause"],
      T
    >;
    export type ViolationStatus<T> = BaseQueryArgs<
      DbContext["query"]["violationStatuses"],
      Repositories.ViolationStatus["buildWhereClause"],
      T
    >;
  }

  export namespace QueryFilters {
    type PartialWithUndefined<T> = {
      [K in keyof T]?: T[K] | undefined;
    };

    type BaseQueryFilter<TModel> = {
      filterType?: "and" | "or" | undefined;
    } & PartialWithUndefined<TModel>;

    export type ViolationRecord =
      BaseQueryFilter<Db.ViewModels.ViolationRecord>;

    export type ViolationStatus =
      BaseQueryFilter<Db.ViewModels.ViolationStatus>;
  }
}
