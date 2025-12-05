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
    export type Class<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Class, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Class>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.ClassOffering, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type College<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.College, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.College>,
      T
    >;

    export type Course<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Course, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Course>,
      T
    >;

    export type Department<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Department, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Department>,
      T
    >;

    export type Enrollment<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Enrollment, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type Term<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.Term, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace InsertArgs {
    export type Class<T> = BaseRepositoryType.InsertArgs<
      Tables.Class,
      SQLiteInsertBuilder<Tables.Class, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Class>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.InsertArgs<
      Tables.ClassOffering,
      SQLiteInsertBuilder<Tables.ClassOffering, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type College<T> = BaseRepositoryType.InsertArgs<
      Tables.College,
      SQLiteInsertBuilder<Tables.College, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.College>,
      T
    >;

    export type Course<T> = BaseRepositoryType.InsertArgs<
      Tables.Course,
      SQLiteInsertBuilder<Tables.Course, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Course>,
      T
    >;

    export type Department<T> = BaseRepositoryType.InsertArgs<
      Tables.Department,
      SQLiteInsertBuilder<Tables.Department, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Department>,
      T
    >;

    export type Enrollment<T> = BaseRepositoryType.InsertArgs<
      Tables.Enrollment,
      SQLiteInsertBuilder<Tables.Enrollment, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type Term<T> = BaseRepositoryType.InsertArgs<
      Tables.Term,
      SQLiteInsertBuilder<Tables.Term, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace UpdateArgs {
    export type Class<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Class, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Class>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.ClassOffering, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type College<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.College, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.College>,
      T
    >;

    export type Course<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Course, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Course>,
      T
    >;

    export type Department<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Department, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Department>,
      T
    >;

    export type Enrollment<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Enrollment, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type Term<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.Term, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace ContextArgs {
    export type ClassOffering<T> = BaseRepositoryType.ContextArgs<
      Tables.ClassOffering,
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      BaseRepositoryType.BuildOrder<Tables.ClassOffering>,
      T
    >;

    export type Enrollment<T> = BaseRepositoryType.ContextArgs<
      Tables.Enrollment,
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      BaseRepositoryType.BuildOrder<Tables.Enrollment>,
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
    export type Class<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["classes"],
      BaseRepositoryType.BuildWhereClause<Tables.Class>,
      T
    >;

    export type ClassOffering<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["classOfferings"],
      BaseRepositoryType.BuildWhereClause<Tables.ClassOffering>,
      T
    >;

    export type College<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["colleges"],
      BaseRepositoryType.BuildWhereClause<Tables.College>,
      T
    >;

    export type Course<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["courses"],
      BaseRepositoryType.BuildWhereClause<Tables.Course>,
      T
    >;

    export type Department<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["departments"],
      BaseRepositoryType.BuildWhereClause<Tables.Department>,
      T
    >;

    export type Enrollment<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["enrollments"],
      BaseRepositoryType.BuildWhereClause<Tables.Enrollment>,
      T
    >;

    export type Term<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["terms"],
      BaseRepositoryType.BuildWhereClause<Tables.Term>,
      T
    >;
  }

  export namespace QueryFilters {
    export type Class = BaseRepositoryType.QueryFilter<Tables.Class>;

    export type ClassOffering =
      BaseRepositoryType.QueryFilter<Tables.ClassOffering>;

    export type College = BaseRepositoryType.QueryFilter<Tables.College>;

    export type Course = BaseRepositoryType.QueryFilter<Tables.Course>;

    export type Department = BaseRepositoryType.QueryFilter<Tables.Department>;

    export type Enrollment = BaseRepositoryType.QueryFilter<Tables.Enrollment>;

    export type Term = BaseRepositoryType.QueryFilter<Tables.Term>;
  }
}
