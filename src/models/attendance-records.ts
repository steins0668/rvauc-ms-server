import { relations } from "drizzle-orm";
import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { enrollments, students } from "./schema";

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    enrollmentId: integer("enrollment_id")
      .notNull()
      .references(() => enrollments.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    status: text("status").notNull(),
    recordedAt: text("recorded_at").notNull(), //  ! complete ISO date
    recordedMs: integer("recorded_ms").notNull(), //  ! epoch ms
    datePh: text("date_ph").notNull(), //  ! Ph date (yyyy-mm-dd)
  },
  (t) => [
    uniqueIndex("uidx_attendance_records_student_id_enrollment_id_date_ph").on(
      t.studentId,
      t.enrollmentId,
      t.datePh
    ),
  ]
);

export const attendanceRecordsRelations = relations(
  attendanceRecords,
  ({ one }) => ({
    student: one(students, {
      fields: [attendanceRecords.studentId],
      references: [students.id],
    }),
    enrollment: one(enrollments, {
      fields: [attendanceRecords.enrollmentId],
      references: [enrollments.id],
    }),
  })
);
