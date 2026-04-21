import { execTransaction, TxContext } from "../../db/create-context";
import { Seeders as AttendanceRecords } from "./enrollments/attendance/seeders";
import { Seeders as Auth } from "./auth/seeders";
import { Seeders as Enrollments } from "./enrollments/seeders";
import { Seeders as UniformCompliance } from "./uniform-compliance/seeders";
import { Seeders as Violations } from "./violations/seeders";

export const seedDatabase = async (
  args?:
    | Partial<{
        include: Partial<{
          offerings: boolean;
          enrollments: boolean;
          sessions: boolean;
          attendance: boolean;
          uniformCompliance: boolean;
        }>;
        tx: TxContext;
      }>
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

    const { include } = args ?? {
      include: {
        attendance: true,
        enrollments: true,
        offerings: true,
        sessions: true,
        uniformCompliance: true,
      },
    };

    if (!include?.offerings) return;

    const classOfferings = await Enrollments.seedClassOfferings(tx);

    if (!include.enrollments) return;

    const enrollments = await Enrollments.seedEnrollments(tx); //  * dependent on auth-students

    const classSessionDateRange = {
      startDate: "2025-09-30",
      endDate: "2025-12-24",
    };

    const classSessions = await Enrollments.seedClassSessions({
      ...classSessionDateRange,
      classOfferings,
      dbOrTx: tx,
    });

    if (!include?.attendance) return;

    const attendanceDateRange = {
      startDate: "2025-09-30",
      endDate: "2025-11-30",
    };

    await AttendanceRecords.seedAttendanceRecords({
      ...attendanceDateRange,
      classes,
      classOfferings,
      classSessions,
      enrollments,
      dbOrTx: tx,
    });

    if (!include?.uniformCompliance) return;

    await UniformCompliance.seedRecords({
      ...attendanceDateRange,
      offerings: classOfferings,
      enrollments,
      dbOrTx: tx,
    });
  }, args?.tx);
};

seedDatabase();
