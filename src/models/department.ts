import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { College } from "./college";

export const Department = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  collegeId: integer("college_id")
    .notNull()
    .references(() => College.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  name: text("name").unique().notNull(),
});
