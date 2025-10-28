import { DbContext, TxContext } from "../../../db/create-context";
import { Repositories } from "../services";

export namespace QueryArgs {
  export type Professor<T> = {
    dbOrTx?: DbContext | TxContext | undefined;
    fn: (
      query: DbContext["query"]["professors"],
      filterConverter: Repositories.ProfessorRepository["buildWhereClause"]
    ) => Promise<T>;
  };

  export type Student<T> = {
    dbOrTx?: DbContext | TxContext | undefined;
    fn: (
      query: DbContext["query"]["students"],
      filterConverter: Repositories.StudentRepository["buildWhereClause"]
    ) => Promise<T>;
  };

  export type User<T> = {
    dbOrTx?: DbContext | TxContext | undefined;
    fn: (
      query: DbContext["query"]["users"],
      filterConverter: Repositories.UserRepository["buildWhereClause"]
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
