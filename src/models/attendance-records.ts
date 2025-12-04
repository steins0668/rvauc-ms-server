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
    recordedDate: text("recorded_date").notNull(), //  ! date only ISO (time is 0)
    recordedTime: integer("recorded_time").notNull(), //  ! time stamp
  },
  (t) => [
    uniqueIndex(
      "uidx_attendance_records_student_id_enrollment_id_recorded_date"
    ).on(t.studentId, t.enrollmentId, t.recordedDate),
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
