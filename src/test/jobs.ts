import { Attendance } from "../features/enrollments/subfeatures/attendance";

Attendance.Jobs.markAbsent()
  .then(() => console.log("mark absent finished"))
  .catch(console.error);
