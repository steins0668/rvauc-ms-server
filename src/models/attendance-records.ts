import { relations } from "drizzle-orm";
import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { classes, students } from "./schema";

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
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    status: text("status").notNull(),
    recordCount: integer("record_count").notNull().default(1),
    recordedAt: text("recorded_at").notNull(), //  ! complete ISO date
    recordedMs: integer("recorded_ms").notNull(), //  ! epoch ms
    datePh: text("date_ph").notNull(), //  ! Ph date (yyyy-mm-dd)
  },
  (t) => [
    uniqueIndex("uidx_attendance_records_student_id_class_id_date_ph").on(
      t.studentId,
      t.classId,
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
    class: one(classes, {
      fields: [attendanceRecords.classId],
      references: [classes.id],
    }),
  })
);
