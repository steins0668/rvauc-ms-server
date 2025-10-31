import { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, LibSQLDatabase, LibSQLTransaction } from "drizzle-orm/libsql";
import { ENV } from "../data";
import { Schema } from "../models";

export type DbContext = LibSQLDatabase<typeof Schema>;
export type TxContext = LibSQLTransaction<
  typeof Schema,
  ExtractTablesWithRelations<typeof Schema>
>;

export type DbOrTx = DbContext | TxContext;

let dbContext: DbContext | undefined;

export async function createContext(): Promise<DbContext> {
  if (dbContext === undefined) {
    dbContext = drizzle(ENV.getDbUrl(), { schema: Schema });
    dbContext.run("PRAGMA foreign_keys=ON;");
  }

  return dbContext;
}
