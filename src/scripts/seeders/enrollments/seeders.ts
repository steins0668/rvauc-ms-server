import { createContext, DbOrTx } from "../../../db/create-context";
import { Enrollments } from "../../../features/enrollments";
import { Schema } from "../../../models";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedTerms = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.terms)
      .values({ id: 1, yearStart: 2025, yearEnd: 2026, semester: 1 })
      .onConflictDoNothing()
      .returning();
  };

  export const seedColleges = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.colleges)
      .values(SampleData.colleges)
      .onConflictDoNothing()
      .returning();
  };

  export const seedDepartments = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.departments)
      .values(SampleData.departments)
      .onConflictDoNothing()
      .returning();
  };

  export const seedRooms = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.rooms)
      .values(SampleData.rooms)
      .onConflictDoNothing()
      .returning();
  };

  export const seedCourses = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.courses)
      .values(SampleData.courses)
      .onConflictDoNothing()
      .returning();
  };

  export const seedClasses = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.classes)
      .values(SampleData.classes)
      .onConflictDoNothing()
      .returning();
  };

  export const seedClassOfferings = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.classOfferings)
      .values(SampleData.classOfferings)
      .onConflictDoNothing()
      .returning();
  };

  export const seedClassSessions = async (args: {
    classOfferings: Enrollments.Types.ViewModels.ClassOffering[];
    startDate: string;
    endDate: string;
    dbOrTx?: DbOrTx | undefined;
  }) => {
    const context = args.dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.classSessions)
      .values(SampleData.generateClassSessions(args))
      .onConflictDoNothing()
      .returning();
  };

  export const seedEnrollments = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.enrollments)
      .values(SampleData.enrollments)
      .onConflictDoNothing()
      .returning();
  };
}
