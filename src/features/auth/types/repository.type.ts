import { ResultSet } from "@libsql/client/.";
import {
  SQLiteInsertBuilder,
  SQLiteUpdateBuilder,
} from "drizzle-orm/sqlite-core";
import { DbContext, DbOrTx } from "../../../db/create-context";
import { Repositories } from "../services";
import * as Tables from "./auth-tables.type";

export namespace InsertArgs {
  type BaseInsertArgs<
    TInsertBuilder extends object,
    TFilterConverter extends Function,
    TResult
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

  export type SessionToken<T> = BaseInsertArgs<
    SQLiteInsertBuilder<Tables.SessionTokens, "async", ResultSet>,
    Repositories.SessionToken["buildWhereClause"],
    T
  >;
}

export namespace UpdateArgs {
  export type SessionToken<T> = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      update: SQLiteUpdateBuilder<Tables.SessionTokens, "async", ResultSet>,
      filterConverter: Repositories.SessionToken["buildWhereClause"]
    ) => Promise<T>;
  };
}

export namespace QueryArgs {
  export type Professor<T> = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      query: DbContext["query"]["professors"],
      filterConverter: Repositories.Professor["buildWhereClause"]
    ) => Promise<T>;
  };

  export type SessionToken<T> = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      query: DbContext["query"]["sessionTokens"],
      filterConverter: Repositories.SessionToken["buildWhereClause"]
    ) => Promise<T>;
  };

  export type Student<T> = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      query: DbContext["query"]["students"],
      filterConverter: Repositories.Student["buildWhereClause"]
    ) => Promise<T>;
  };

  export type User<T> = {
    dbOrTx?: DbOrTx | undefined;
    fn: (
      query: DbContext["query"]["users"],
      filterConverter: Repositories.User["buildWhereClause"]
    ) => Promise<T>;
  };
}

export namespace QueryFilters {
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
