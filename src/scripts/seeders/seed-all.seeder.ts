import { execTransaction } from "../../db/create-context";
import { Seeders as AttendanceRecords } from "./enrollments/attendance/seeders";
import { Seeders as Auth } from "./auth/seeders";
import { Seeders as Enrollments } from "./enrollments/seeders";
import { Seeders as UniformCompliance } from "./uniform-compliance/seeders";
import { Seeders as Violations } from "./violations/seeders";

export const seedDatabase = async () => {
  await execTransaction(async (tx) => {
    //  miscellaneous (no dependencies)
    await Enrollments.seedTerms(tx);
    await Violations.seedViolationStatuses(tx);

    await Enrollments.seedColleges(tx);
    await Enrollments.seedDepartments(tx);

    await UniformCompliance.seedUniformTypes(tx); //  * dependent on enrollments-departments

    await Enrollments.seedRooms(tx);
    await Auth.seedRoles(tx);

    await Auth.seedProfessors(tx); //  * dependent on enrollments-colleges
    await Auth.seedStudents(tx); //  * dependent on enrollments-departments

    await Enrollments.seedCourses(tx);
    const classes = await Enrollments.seedClasses(tx); //  * dependent on auth-professors
    const classOfferings = await Enrollments.seedClassOfferings(tx);
    const enrollments = await Enrollments.seedEnrollments(tx); //  * dependent on auth-students

    const dateRange = {
      startDate: "2025-09-30",
      endDate: "2025-11-30",
    };

    const classSessions = await Enrollments.seedClassSessions({
      ...dateRange,
      classOfferings,
      dbOrTx: tx,
    });

    await AttendanceRecords.seedAttendanceRecords({
      ...dateRange,
      classes,
      classOfferings,
      classSessions,
      enrollments,
      dbOrTx: tx,
    });

    await UniformCompliance.seedRecords({ ...dateRange, dbOrTx: tx });
  });
};

seedDatabase();
