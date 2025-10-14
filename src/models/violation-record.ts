import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { Student } from "./student";
import { ViolationStatus } from "./violation-status";

export const ViolationRecord = sqliteTable("violation_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => Student.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  statusId: integer("status_id")
    .notNull()
    .references(() => ViolationStatus.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  number: text("number").unique().notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
});
