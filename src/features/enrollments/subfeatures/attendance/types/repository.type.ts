import { ResultSet } from "@libsql/client/.";
import {
  SQLiteDeleteBase,
  SQLiteInsertBuilder,
  SQLiteUpdateBuilder,
} from "drizzle-orm/sqlite-core";
import { DbContext } from "../../../../../db/create-context";
import { BaseRepositoryType } from "../../../../../types";
import { Tables } from "./db.type";

export namespace Repository {
  export namespace DeleteArgs {
    export type AttendanceRecord<T> = BaseRepositoryType.DeleteArgs<
      SQLiteDeleteBase<Tables.AttendanceRecord, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.AttendanceRecord>,
      T
    >;
  }

  export namespace InsertArgs {
    export type AttendanceRecord<T> = BaseRepositoryType.InsertArgs<
      Tables.AttendanceRecord,
      SQLiteInsertBuilder<Tables.AttendanceRecord, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.AttendanceRecord>,
      T
    >;
  }

  export namespace UpdateArgs {
    export type AttendanceRecord<T> = BaseRepositoryType.UpdateArgs<
      SQLiteUpdateBuilder<Tables.AttendanceRecord, "async", ResultSet>,
      BaseRepositoryType.BuildWhereClause<Tables.AttendanceRecord>,
      T
    >;
  }

  export namespace QueryArgs {
    export type AttendanceRecord<T> = BaseRepositoryType.QueryArgs<
      DbContext["query"]["attendanceRecords"],
      BaseRepositoryType.BuildWhereClause<Tables.AttendanceRecord>,
      T
    >;
  }

  export namespace QueryFilters {
    export type AttendanceRecord =
      BaseRepositoryType.QueryFilter<Tables.AttendanceRecord>;
  }
}
