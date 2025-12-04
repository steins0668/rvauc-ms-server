import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { attendanceRecords, classOfferings, students, terms } from "./schema";

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id),
  classId: integer("class_id")
    .notNull()
    .references(() => classOfferings.id),
  termId: integer("term_id")
    .notNull()
    .references(() => terms.id),
  status: text("status").notNull(),
});

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  attendanceRecords: many(attendanceRecords),
  class: one(classOfferings, {
    fields: [enrollments.classId],
    references: [classOfferings.id],
  }),
  term: one(terms, {
    fields: [enrollments.termId],
    references: [terms.id],
  }),
}));
