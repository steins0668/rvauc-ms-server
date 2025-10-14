import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { Student } from "./student";
import { AttendanceStatus } from "./attendance-status";

export const AttendanceRecord = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => Student.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  statusId: integer("status_id")
    .notNull()
    .references(() => AttendanceStatus.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  date: text("date").notNull(),
});
