import { Schema } from "../../../../../models";

export namespace InsertModels {
  export type AttendanceRecord = typeof Schema.attendanceRecords.$inferInsert;
}

export namespace Tables {
  export type AttendanceRecord = typeof Schema.attendanceRecords;
}

export namespace ViewModels {
  export type AttendanceRecord = typeof Schema.attendanceRecords.$inferSelect;
}
