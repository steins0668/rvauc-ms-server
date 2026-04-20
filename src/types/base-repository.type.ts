import { ResultSet } from "@libsql/client/.";
import { InferSelectModel, sql, SQL } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { DbOrTx } from "../db/create-context";
import { RepositoryUtil } from "../utils";

export namespace BaseRepositoryType {
  type AnyFunc = (...args: any[]) => any;

  export type DeleteArgs<
    TDeleteBuilder extends object,
    TFilterConverter extends AnyFunc,
    TResult = ResultSet,
  > = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      deleteBase: TDeleteBuilder,
      converter: TFilterConverter,
    ) => Promise<TResult>;
  };

  export type InsertArgs<
    TTable extends SQLiteTable,
    TInsertBuilder extends object,
    TFilterConverter extends AnyFunc,
    TResult = ResultSet,
  > = {
    dbOrTx?: DbOrTx | undefined;
    fn: (args: {
      table: TTable;
      insert: TInsertBuilder;
      converter: TFilterConverter;
      sql: typeof sql;
    }) => Promise<TResult>;
  };

  export type UpdateArgs<
    TUpdateBuilder extends object,
    TFilterConverter extends AnyFunc,
    TResult = ResultSet,
  > = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      update: TUpdateBuilder,
      converter: TFilterConverter,
    ) => Promise<TResult>;
  };

  export type ContextArgs<
    TTable extends SQLiteTable,
    TFilterConverter extends AnyFunc,
    TOrderConfigurator extends AnyFunc,
    TResult,
  > = {
    dbOrTx?: DbOrTx | undefined;
    fn: (args: {
      table: TTable;
      context: DbOrTx;
      converter: TFilterConverter;
      order: TOrderConfigurator;
      sql: typeof sql;
    }) => TResult;
  };

  export type SubQueryArgs<
    TTable extends SQLiteTable,
    TSelectBase extends object,
    TFilterConverter extends AnyFunc,
    TOrderConfigurator extends AnyFunc,
    TSubQuery,
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
    TResult = ResultSet,
  > = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      query: TRelationalQueryBuilder,
      converter: TFilterConverter,
    ) => Promise<TResult>;
  };

  export type QueryConstraints =
    | Partial<{
        limit: number | undefined;
        offset: number | undefined;
        unlimited: number | undefined;
      }>
    | undefined;

  export type Filters = typeof RepositoryUtil.filters;

  export type WhereBuilder<TTable extends SQLiteTable> = (
    table: TTable,
    filters: Filters,
  ) => SQL | undefined;

  export type QueryFilter<
    TTable extends SQLiteTable,
    TModel = InferSelectModel<TTable>,
  > = {
    filterType?: "and" | "or" | undefined;
  } & PartialWithUndefined<TModel> & {
      custom?:
        | ((table: TTable, filters: Filters) => (SQL | undefined)[])
        | undefined;
    };

  export type BuildWhereClause<TTable extends SQLiteTable> = (
    filter?: QueryFilter<TTable>,
  ) => SQL | undefined;

  export type OrderOperators = typeof RepositoryUtil.orderOperators;

  export type OrderBuilder<TTable extends SQLiteTable> = (
    table: TTable,
    operators: OrderOperators,
  ) => SQL;

  export type BuildOrder<TTable extends SQLiteTable> = (
    configureOrder: OrderBuilder<TTable>,
  ) => SQL;
}
