import { createContext, DbOrTx } from "../../../db/create-context";
import { Enrollments } from "../../../features/enrollments";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedTerms = async (dbOrTx?: DbOrTx | undefined) => {
    const termRepo = new Enrollments.Repositories.Term(await createContext());

    return await termRepo.execInsert({
      dbOrTx,
      fn: async ({ insert }) =>
        insert
          .values({ id: 1, yearStart: 2025, yearEnd: 2026, semester: 1 })
          .returning(),
    });
  };

  export const seedColleges = async (dbOrTx?: DbOrTx | undefined) => {
    const repo = new Enrollments.Repositories.College(await createContext());

    return await repo.execInsert({
      dbOrTx,
      fn: async ({ insert }) => insert.values(SampleData.colleges).returning(),
    });
  };

  export const seedDepartments = async (dbOrTx?: DbOrTx | undefined) => {
    const repo = new Enrollments.Repositories.Department(await createContext());

    return await repo.execInsert({
      dbOrTx,
      fn: async ({ insert }) =>
        insert.values(SampleData.departments).returning(),
    });
  };

  export const seedRooms = async (dbOrTx?: DbOrTx | undefined) => {
    const repo = new Enrollments.Repositories.Room(await createContext());

    return await repo.execInsert({
      dbOrTx,
      fn: async ({ insert }) => insert.values(SampleData.rooms).returning(),
    });
  };

  export const seedCourses = async (dbOrTx?: DbOrTx | undefined) => {
    const courseRepo = new Enrollments.Repositories.Course(
      await createContext(),
    );

    return await courseRepo.execInsert({
      dbOrTx,
      fn: async ({ insert }) => insert.values(SampleData.courses).returning(),
    });
  };

  export const seedClasses = async (dbOrTx?: DbOrTx | undefined) => {
    const classRepo = new Enrollments.Repositories.Class(await createContext());

    return await classRepo.execInsert({
      dbOrTx,
      fn: async ({ insert }) => insert.values(SampleData.classes).returning(),
    });
  };

  export const seedClassOfferings = async (dbOrTx?: DbOrTx | undefined) => {
    const offeringRepo = new Enrollments.Repositories.ClassOffering(
      await createContext(),
    );

    return await offeringRepo.execInsert({
      dbOrTx,
      fn: async ({ insert }) =>
        insert.values(SampleData.classOfferings).returning(),
    });
  };

  export const seedClassSessions = async (args: {
    classOfferings: Enrollments.Types.ViewModels.ClassOffering[];
    startDate: string;
    endDate: string;
    dbOrTx?: DbOrTx | undefined;
  }) => {
    const clsSessionRepo = new Enrollments.Repositories.ClassSession(
      await createContext(),
    );

    return await clsSessionRepo.execInsert({
      dbOrTx: args.dbOrTx,
      fn: async ({ insert }) =>
        insert.values(SampleData.generateClassSessions(args)).returning(),
    });
  };

  export const seedEnrollments = async (dbOrTx?: DbOrTx | undefined) => {
    const enrollmentRepo = new Enrollments.Repositories.Enrollment(
      await createContext(),
    );

    return await enrollmentRepo.execInsert({
      dbOrTx,
      fn: async ({ insert }) =>
        insert.values(SampleData.enrollments).returning(),
    });
  };
}
