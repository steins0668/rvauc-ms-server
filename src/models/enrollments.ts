import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { classOfferings, students, terms } from "./schema";

export const enrollments = sqliteTable("enrollments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id),
  classOfferingId: integer("class_offering_id")
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
  classOffering: one(classOfferings, {
    fields: [enrollments.classOfferingId],
    references: [classOfferings.id],
  }),
  term: one(terms, {
    fields: [enrollments.termId],
    references: [terms.id],
  }),
}));
