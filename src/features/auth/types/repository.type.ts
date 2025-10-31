import { ResultSet } from "@libsql/client/.";
import {
  SQLiteInsertBuilder,
  SQLiteUpdateBuilder,
} from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { Repositories } from "../services";
import * as Tables from "./auth-tables.type";
import { ViewModels } from ".";

type AnyFunc = (...args: any[]) => any;

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

  export type Professor<T> = BaseInsertArgs<
    SQLiteInsertBuilder<Tables.Professors, "async", ResultSet>,
    Repositories.Professor["buildWhereClause"],
    T
  >;

  export type Role<T> = BaseInsertArgs<
    SQLiteInsertBuilder<Tables.Roles, "async", ResultSet>,
    Repositories.Role["buildWhereClause"],
    T
  >;

  export type SessionToken<T> = BaseInsertArgs<
    SQLiteInsertBuilder<Tables.SessionTokens, "async", ResultSet>,
    Repositories.SessionToken["buildWhereClause"],
    T
  >;

  export type Student<T> = BaseInsertArgs<
    SQLiteInsertBuilder<Tables.Student, "async", ResultSet>,
    Repositories.Student["buildWhereClause"],
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

  export type SessionToken<T> = BaseUpdateArgs<
    SQLiteUpdateBuilder<Tables.SessionTokens, "async", ResultSet>,
    Repositories.SessionToken["buildWhereClause"],
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

  export type Professor<T> = BaseQueryArgs<
    DbContext["query"]["professors"],
    Repositories.Professor["buildWhereClause"],
    T
  >;

  export type SessionToken<T> = BaseQueryArgs<
    DbContext["query"]["sessionTokens"],
    Repositories.SessionToken["buildWhereClause"],
    T
  >;

  export type Student<T> = BaseQueryArgs<
    DbContext["query"]["students"],
    Repositories.Student["buildWhereClause"],
    T
  >;

  export type User<T> = BaseQueryArgs<
    DbContext["query"]["users"],
    Repositories.User["buildWhereClause"],
    T
  >;
}

export namespace QueryFilters {
  type PartialWithUndefined<T> = {
    [K in keyof T]?: T[K] | undefined;
  };
  /**
   * @description A type for the filter used for Db queries on the `students` table.
   * Contains the following fields:
   * ### Filters:
   * - `filterType`: Option to decide whether the filter is an `or` or an `and`.
   * - `id`: Matches the student's id.
   * - `collegeId`: Matches the professor's collegeId.
   * - `facultyRank`: Matches the student's facultyRank.
   */
  export type Professor = {
    filterType?: "and" | "or" | undefined;
    id?: number | undefined;
    collegeId?: number | undefined;
    facultyRank?: string | undefined;
  };

  export type SessionToken = {
    filterType?: "and" | "or" | undefined;
    id?: number | undefined;
    sessionId?: number | undefined;
    tokenHash?: string | undefined;
    isUsed?: boolean | undefined;
  };

  export type Role = {
    filterType?: "and" | "or" | undefined;
  } & PartialWithUndefined<ViewModels.Role>;

  /**
   * @description A type for the filter used for Db queries on the `students` table.
   * Contains the following fields:
   * ### Filters:
   * - `filterType`: Option to decide whether the filter is an `or` or an `and`.
   * - `id`: Matches the student's id.
   * - `departmentId`: Matches the student's departmentId.
   * - `studentNumber`: Matches the student's studentNumber.
   * - `yearLevel`: Matches the student's yearLevel.
   * - `block`: Matches the student's block.
   */
  export type Student = {
    filterType?: "and" | "or" | undefined;
    id?: number | undefined;
    departmentId?: number | undefined;
    studentNumber?: string | undefined;
    yearLevel?: number | undefined;
    block?: string | undefined;
  };

  /**
   * @description A type for the filter used for Db queries on the {@link users} table.
   * Contains the following fields:
   * ### Filters:
   * - {@link filterType}: Option to decide whether the filter is an `or` or an `and`.
   * - {@link userId}: Matches the user's userId.
   * - {@link email}: Matches the user's email.
   * - {@link username}: Matches the user's username.
   */
  export type User = {
    filterType?: "and" | "or";
    userId?: number;
    email?: string;
    username?: string;
  };
}
