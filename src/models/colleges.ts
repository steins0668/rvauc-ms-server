import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const colleges = sqliteTable("colleges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
});
