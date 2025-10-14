import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { Department } from "./department";
import { User } from "./user";

export const Student = sqliteTable("students", {
  id: integer("id")
    .primaryKey()
    .references(() => User.id, { onDelete: "restrict", onUpdate: "cascade" }),
  departmentId: integer("department_id")
    .notNull()
    .references(() => Department.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  studentNumber: text("student_number").unique().notNull(),
  yearLevel: integer("year_level").notNull(),
  block: text("block").notNull(),
});
