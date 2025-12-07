import { relations } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { classOfferings, courses, professors, terms } from "./schema";

export const classes = sqliteTable(
  "classes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    professorId: integer("professor_id")
      .notNull()
      .references(() => professors.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    termId: integer("term_id").notNull(),
    classNumber: text("class_number").notNull(),
  },
  (t) => [
    uniqueIndex("uidx_classes_professor_id_course_id_term_id_class_number").on(
      t.professorId,
      t.courseId,
      t.termId,
      t.classNumber
    ),
  ]
);

export const classesRelations = relations(classes, ({ one, many }) => ({
  professor: one(professors, {
    fields: [classes.professorId],
    references: [professors.id],
  }),
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  term: one(terms, { fields: [classes.termId], references: [terms.id] }),
  classOfferings: many(classOfferings),
}));
