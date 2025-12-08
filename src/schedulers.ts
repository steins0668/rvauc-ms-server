import cron from "node-cron";
import { Attendance } from "./features/enrollments/subfeatures/attendance";

cron.schedule(
  "0 19 * * *",
  async () => {
    await Attendance.Jobs.markAbsent();
  },
  { timezone: "Asia/Manila" }
);
