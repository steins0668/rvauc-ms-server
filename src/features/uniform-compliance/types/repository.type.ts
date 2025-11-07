import { ResultSet } from "@libsql/client/.";
import {
  SQLiteDeleteBase,
  SQLiteInsertBuilder,
  SQLiteUpdateBuilder,
} from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { Db } from "./db.type";
import { Repositories } from "../repositories";

export namespace Repository {
  type AnyFunc = (...args: any[]) => any;

  export namespace DeleteArgs {
    type BaseDeleteArgs<
      TDeleteBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        deleteBase: TDeleteBuilder,
        filterConverter: TFilterConverter
      ) => Promise<TResult>;
    };

    export type ComplianceRecord<T> = BaseDeleteArgs<
      SQLiteDeleteBase<Db.Tables.ComplianceRecord, "async", ResultSet>,
      Repositories.ComplianceRecord["buildWhereClause"],
      T
    >;
  }

  export namespace InsertArgs {
    type BaseInsertArgs<
      TInsertBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        insert: TInsertBuilder,
        filterConverter: TFilterConverter
      ) => Promise<TResult>;
    };

    export type ComplianceRecord<T> = BaseInsertArgs<
      SQLiteInsertBuilder<Db.Tables.ComplianceRecord, "async", ResultSet>,
      Repositories.ComplianceRecord["buildWhereClause"],
      T
    >;
  }

  export namespace UpdateArgs {
    type BaseUpdateArgs<
      TUpdateBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        update: TUpdateBuilder,
        filterConverter: TFilterConverter
      ) => Promise<TResult>;
    };

    export type ComplianceRecord<T> = BaseUpdateArgs<
      SQLiteUpdateBuilder<Db.Tables.ComplianceRecord, "async", ResultSet>,
      Repositories.ComplianceRecord["buildWhereClause"],
      T
    >;
  }

  export namespace QueryArgs {
    type BaseQueryArgs<
      TRelationalQueryBuilder extends object,
      TFilterConverter extends AnyFunc,
      TResult = ResultSet
    > = {
      dbOrTx?: DbOrTx | undefined;
      fn: (
        query: TRelationalQueryBuilder,
        filterConverter: TFilterConverter
      ) => Promise<TResult>;
    };

    export type ComplianceRecord<T> = BaseQueryArgs<
      DbContext["query"]["complianceRecords"],
      Repositories.ComplianceRecord["buildWhereClause"],
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

    export type ComplianceRecord =
      BaseQueryFilter<Db.ViewModels.ComplianceRecord>;
  }
}
