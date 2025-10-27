import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { students } from "./students";
import { violationStatuses } from "./violation-statuses";

export const violationRecords = sqliteTable("violation_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  statusId: integer("status_id")
    .notNull()
    .references(() => violationStatuses.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  number: text("number").unique().notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
});
