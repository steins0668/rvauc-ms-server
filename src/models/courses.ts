import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").unique().notNull(),
  name: text("name").unique().notNull(),
  units: integer("units").notNull(),
});
