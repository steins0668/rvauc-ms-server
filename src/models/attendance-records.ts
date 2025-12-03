import { relations } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { attendanceStatuses, enrollments, students } from "./schema";

export const attendanceRecords = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  enrollmentId: integer("enrollment_id")
    .notNull()
    .references(() => enrollments.id, {
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
    enrollment: one(enrollments, {
      fields: [attendanceRecords.enrollmentId],
      references: [enrollments.id],
    }),
    status: one(attendanceStatuses, {
      fields: [attendanceRecords.statusId],
      references: [attendanceStatuses.id],
    }),
  })
);
