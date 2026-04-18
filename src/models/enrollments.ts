import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { attendanceRecords, classes, students } from "./schema";

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  status: text("status").notNull(),
});

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  attendanceRecords: many(attendanceRecords),
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));
