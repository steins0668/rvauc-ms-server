import {
  createContext,
  execTransaction,
  TxContext,
} from "../../db/create-context";
import { attendanceRecords } from "../../models";
import { SampleData } from "../seeders/enrollments/sample-data";
import { Seeders } from "../seeders/enrollments/attendance/seeders";

export const resetAttendanceRecords = async (tx?: TxContext | undefined) => {
  await execTransaction(async (tx) => {
    await tx.run(`PRAGMA foreign_keys = OFF;`);

    await tx.delete(attendanceRecords);

    const attendanceDateRange = {
      startDate: "2025-09-30",
      endDate: "2025-11-30",
    };
    const classSessionDateRange = {
      startDate: "2025-09-30",
      endDate: "2025-12-24",
    };

    await Seeders.seedAttendanceRecords({
      ...attendanceDateRange,
      classes: SampleData.classes,
      classOfferings: SampleData.classOfferings,
      classSessions: SampleData.generateClassSessions({
        classOfferings: SampleData.classOfferings,
        ...classSessionDateRange,
      }),
      enrollments: SampleData.enrollments,
      dbOrTx: tx,
    });

    await tx.run(`PRAGMA foreign_keys = ON;`);
  }, tx);
};

resetAttendanceRecords();
