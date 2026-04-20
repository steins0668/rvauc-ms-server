import { relations } from "drizzle-orm";
import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { classes, classSessions, enrollments, students, users } from "./schema";

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    classSessionId: integer("class_session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    recordCount: integer("record_count").notNull().default(1),
    recordedAt: text("recorded_at").notNull(), //  ! complete ISO date
    recordedMs: integer("recorded_ms").notNull(), //  ! epoch ms
    updatedAt: text("updated_at").notNull(),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
    datePh: text("date_ph").notNull(), //  ! Ph date (yyyy-mm-dd)
  },
  (t) => [
    index("idx_attendance_records_recordedMs").on(t.recordedMs),
    index("idx_attendance_records_enrollment_id_class_id").on(
      t.enrollmentId,
      t.classId,
    ),
    uniqueIndex(
      "uidx_attendance_records_enrollment_id_class_session_id_date_ph",
    ).on(t.enrollmentId, t.classSessionId, t.datePh),
  ],
);

export const attendanceRecordsRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    enrollment: one(enrollments, {
      fields: [attendanceRecords.enrollmentId],
      references: [enrollments.id],
    }),
    class: one(classes, {
      fields: [attendanceRecords.classId],
      references: [classes.id],
    }),
    classSession: one(classSessions, {
      fields: [attendanceRecords.classSessionId],
      references: [classSessions.id],
    }),
    updatedByUser: one(users, {
      fields: [attendanceRecords.updatedByUserId],
      references: [users.id],
    }),
  }),
);
