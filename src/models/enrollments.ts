import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { classes } from "./classes";
import { students } from "./students";
import { terms } from "./terms";

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id),
  termId: integer("term_id")
    .notNull()
    .references(() => terms.id),
  status: text("status").notNull(),
});

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
  term: one(terms, {
    fields: [enrollments.termId],
    references: [terms.id],
  }),
}));
