import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { Student } from "./student";
import { UniformType } from "./uniform-type";
import { int } from "zod";

export const ComplianceRecord = sqliteTable("compliance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => Student.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  uniformTypeId: integer("uniform_type_id")
    .notNull()
    .references(() => UniformType.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  validFootwear: integer("valid_footwear", { mode: "boolean" }).notNull(),
  hasId: integer("has_id", { mode: "boolean" }).notNull(),
  validUpperwear: integer("valid_upperwear", { mode: "boolean" }).notNull(),
  valid_bottoms: integer("valid_bottoms", { mode: "boolean" }).notNull(),
});
