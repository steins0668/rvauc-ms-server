import { relations } from "drizzle-orm";
import { sqliteTable, integer } from "drizzle-orm/sqlite-core";
import { courses } from "./courses";
import { professors } from "./professors";

export const classes = sqliteTable("classes", {
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
});

export const classesRelations = relations(classes, ({ one }) => ({
  professor: one(professors, {
    fields: [classes.professorId],
    references: [professors.id],
  }),
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
}));
