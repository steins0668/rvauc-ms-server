import { relations } from "drizzle-orm";
import { integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { students } from "./students";
import { uniformTypes } from "./uniform-types";

export const complianceRecords = sqliteTable("compliance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  uniformTypeId: integer("uniform_type_id")
    .notNull()
    .references(() => uniformTypes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  validFootwear: integer("valid_footwear", { mode: "boolean" }).notNull(),
  hasId: integer("has_id", { mode: "boolean" }).notNull(),
  validUpperwear: integer("valid_upperwear", { mode: "boolean" }).notNull(),
  valid_bottoms: integer("valid_bottoms", { mode: "boolean" }).notNull(),
});

export const complianceRecordsRelations = relations(
  complianceRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [complianceRecords.studentId],
      references: [students.id],
    }),
    uniformType: one(uniformTypes, {
      fields: [complianceRecords.uniformTypeId],
      references: [uniformTypes.id],
    }),
  })
);
