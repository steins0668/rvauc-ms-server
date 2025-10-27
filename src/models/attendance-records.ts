import { relations } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { students } from "./students";
import { attendanceStatuses } from "./attendance-statuses";

export const attendanceRecords = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  statusId: integer("status_id")
    .notNull()
    .references(() => attendanceStatuses.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  date: text("date").notNull(),
});

export const attendanceRecordsRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [attendanceRecords.studentId],
      references: [students.id],
    }),
    status: one(attendanceStatuses, {
      fields: [attendanceRecords.statusId],
      references: [attendanceStatuses.id],
    }),
  })
);
