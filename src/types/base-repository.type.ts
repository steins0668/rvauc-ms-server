import { ResultSet } from "@libsql/client/.";
import { InferSelectModel, SQL } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { DbOrTx } from "../db/create-context";
import { RepositoryUtil } from "../utils";

export namespace BaseRepositoryType {
  type AnyFunc = (...args: any[]) => any;

  export type DeleteArgs<
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

  export type InsertArgs<
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

  export type UpdateArgs<
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

  export type SubQueryArgs<
    TTable extends SQLiteTable,
    TSelectBase extends object,
    TFilterConverter extends AnyFunc,
    TOrderConfigurator extends AnyFunc,
    TSubQuery
  > = {
    dbOrTx?: DbOrTx | undefined;
    fn: (args: {
      table: TTable;
      selectBase: TSelectBase;
      converter: TFilterConverter;
      order: TOrderConfigurator;
    }) => TSubQuery;
  };

  type PartialWithUndefined<T> = {
    [K in keyof T]?: T[K] | undefined;
  };

  export type QueryArgs<
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

  export type Filters = typeof RepositoryUtil.filters;

  export type QueryFilter<
    TTable extends SQLiteTable,
    TModel = InferSelectModel<TTable>
  > = {
    filterType?: "and" | "or" | undefined;
  } & PartialWithUndefined<TModel> & {
      custom?:
        | ((table: TTable, filters: Filters) => (SQL | undefined)[])
        | undefined;
    };

  export type BuildWhereClause<TTable extends SQLiteTable> = (
    filter?: QueryFilter<TTable>
  ) => SQL | undefined;

  export type OrderOperators = typeof RepositoryUtil.orderOperators;

  export type ConfigureOrder<TTable extends SQLiteTable> = (
    table: TTable,
    operators: OrderOperators
  ) => SQL;

  export type BuildOrder<TTable extends SQLiteTable> = (
    configureOrder: ConfigureOrder<TTable>
  ) => SQL;
}
