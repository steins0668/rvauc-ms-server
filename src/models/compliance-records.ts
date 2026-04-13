import { relations } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { students } from "./students";
import { terms } from "./terms";
import { uniformTypes } from "./uniform-types";
import { users } from "./users";

export const complianceRecords = sqliteTable(
  "compliance_records",
  {
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
    validBottoms: integer("valid_bottoms", { mode: "boolean" }).notNull(),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    createdAt: text("created_at").notNull(),
    recordCount: integer("record_count").notNull().default(1),
    recordedAt: text("recorded_at").notNull(),
    recordedMs: integer("recorded_ms").notNull(), //  ! epoch ms
    updatedAt: text("updated_at").notNull(),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    datePh: text("date_ph").notNull(), //  ! Ph date (yyyy-mm-dd)
  },
  (t) => [
    uniqueIndex(
      "uidx_compliance_records_student_id_uniform_type_id_date_ph",
    ).on(t.studentId, t.uniformTypeId, t.datePh),
  ],
);

export const complianceRecordsRelations = relations(
  complianceRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [complianceRecords.studentId],
      references: [students.id],
    }),
    term: one(terms, {
      fields: [complianceRecords.termId],
      references: [terms.id],
    }),
    uniformType: one(uniformTypes, {
      fields: [complianceRecords.uniformTypeId],
      references: [uniformTypes.id],
    }),
    updatedByUser: one(users, {
      fields: [complianceRecords.updatedByUserId],
      references: [users.id],
    }),
  }),
);
