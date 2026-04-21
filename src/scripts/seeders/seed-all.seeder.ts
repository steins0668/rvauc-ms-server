import { execTransaction } from "../../db/create-context";
import { Seeders as AttendanceRecords } from "./enrollments/attendance/seeders";
import { Seeders as Auth } from "./auth/seeders";
import { Seeders as Enrollments } from "./enrollments/seeders";
import { Seeders as UniformCompliance } from "./uniform-compliance/seeders";
import { Seeders as Violations } from "./violations/seeders";

export const seedDatabase = async (
  args?:
    | Partial<{ include: { attendance: boolean; uniformCompliance: boolean } }>
    | undefined,
) => {
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
      endDate: "2025-12-24",
    };

    const classSessions = await Enrollments.seedClassSessions({
      ...dateRange,
      classOfferings,
      dbOrTx: tx,
    });

    const { include } = args ?? {};

    if (include?.attendance)
      await AttendanceRecords.seedAttendanceRecords({
        ...dateRange,
        classes,
        classOfferings,
        classSessions,
        enrollments,
        dbOrTx: tx,
      });

    if (include?.uniformCompliance)
      await UniformCompliance.seedRecords({
        ...dateRange,
        offerings: classOfferings,
        enrollments,
        dbOrTx: tx,
      });
  });
};

seedDatabase();
