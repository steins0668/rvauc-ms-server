import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { students } from "./students";
import { complianceRecords } from "./compliance-records";
import { violationStatuses } from "./violation-statuses";
import { relations } from "drizzle-orm";

export const violationRecords = sqliteTable("violation_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  statusId: integer("status_id")
    .notNull()
    .references(() => violationStatuses.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  number: text("number").unique().notNull(),
  date: text("date").notNull(),
  reason: text("reason").notNull(),
  complianceRecordId: integer("compliance_record_id").references(
    () => complianceRecords.id,
    { onDelete: "restrict", onUpdate: "cascade" }
  ),
});

export const violationRecordsRelations = relations(
  violationRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [violationRecords.studentId],
      references: [students.id],
    }),
    status: one(violationStatuses, {
      fields: [violationRecords.statusId],
      references: [violationStatuses.id],
    }),
    complianceRecord: one(complianceRecords, {
      fields: [violationRecords.complianceRecordId],
      references: [complianceRecords.id],
    }),
  })
);
