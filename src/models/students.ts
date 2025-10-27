import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { departments } from "./departments";
import { users } from "./users";

export const students = sqliteTable("students", {
  id: integer("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  studentNumber: text("student_number").unique().notNull(),
  yearLevel: integer("year_level").notNull(),
  block: text("block").notNull(),
});
