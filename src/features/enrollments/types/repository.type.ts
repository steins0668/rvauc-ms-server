import { ResultSet } from "@libsql/client/.";
import {
  SQLiteDeleteBase,
  SQLiteInsertBuilder,
  SQLiteSelectBase,
  SQLiteUpdateBuilder,
} from "drizzle-orm/sqlite-core";
import { DbContext } from "../../../db/create-context";
import { BaseRepositoryType } from "../../../types";
import { Tables } from "./db.type";

export namespace Repository {
  export namespace DeleteArgs {
    export type Enrollment<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Enrollment, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.ClassOffering, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type Term<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Term, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace InsertArgs {
    export type Enrollment<T> = BaseRepositoryType.InsertArgs<
      SQLiteInsertBuilder<Tables.Enrollment, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.InsertArgs<
      SQLiteInsertBuilder<Tables.ClassOffering, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type Term<T> = BaseRepositoryType.InsertArgs<
      SQLiteInsertBuilder<Tables.Term, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace UpdateArgs {
    export type Enrollment<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Enrollment, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.ClassOffering, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type Term<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Term, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace SubQueryArgs {
    export type ClassOffering<T> = BaseRepositoryType.SubQueryArgs<
      Tables.ClassOffering,
      SQLiteSelectBase<
        "class_offerings",
        "async",
        ResultSet,
        Tables.ClassOffering["_"]["columns"]
      >,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      BaseRepositoryType.BuildOrder<Tables.ClassOffering>,
      T
    >;

    export type Enrollment<T> = BaseRepositoryType.SubQueryArgs<
      Tables.Enrollment,
      SQLiteSelectBase<
        "enrollments",
        "async",
        ResultSet,
        Tables.Enrollment["_"]["columns"]
      >,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      BaseRepositoryType.BuildOrder<Tables.Enrollment>,
      T
    >;
  }

  export namespace QueryArgs {
    export type Enrollment<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["enrollments"],
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["classOfferings"],
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type Term<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["terms"],
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace QueryFilters {
    export type Enrollment = BaseRepositoryType.QueryFilter<Tables.Enrollment>;

    export type ClassOffering =
      BaseRepositoryType.QueryFilter<Tables.ClassOffering>;

    export type Term = BaseRepositoryType.QueryFilter<Tables.Term>;
  }
}
