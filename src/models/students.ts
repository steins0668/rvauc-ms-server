import { relations } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { attendanceRecords } from "./attendance-records";
import { complianceRecords } from "./compliance-records";
import { departments } from "./departments";
import { users } from "./users";
import { violationRecords } from "./violation-records";

export const students = sqliteTable("students", {
  id: integer("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  studentNumber: text("student_number").unique().notNull(),
  yearLevel: integer("year_level").notNull(),
  block: text("block").notNull(),
});

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.id],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [students.departmentId],
    references: [departments.id],
  }),
  attendanceRecords: many(attendanceRecords),
  complianceRecords: many(complianceRecords),
  violationRecords: many(violationRecords),
}));
