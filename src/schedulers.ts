import cron from "node-cron";
import { Attendance } from "./features/enrollments/subfeatures/attendance";
import { Enrollments } from "./features/enrollments";

cron.schedule(
  "0 19 * * *",
  async () => {
    await Attendance.Jobs.markAbsent();
  },
  { timezone: "Asia/Manila" },
);

cron.schedule(
  "0 0 * * *",
  async () => await Enrollments.Jobs.fillClassSessionsToday(),
  { timezone: "Asia/Manila" },
);
