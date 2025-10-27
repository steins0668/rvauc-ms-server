import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { colleges } from "./colleges";

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  collegeId: integer("college_id")
    .notNull()
    .references(() => colleges.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  name: text("name").unique().notNull(),
});
