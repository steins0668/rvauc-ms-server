import { createContext, DbOrTx } from "../../../db/create-context";
import { Schema } from "../../../models";
import { SampleData } from "./sample-data";
import { Enrollments as EnrollmentsFeature } from "../../../features/enrollments";

export namespace Seeders {
  export const seedUniformTypes = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.uniformTypes)
      .values(SampleData.uniformTypes)
      .onConflictDoNothing()
      .returning();
  };

  export const seedRecords = async (args: {
    dbOrTx?: DbOrTx | undefined;
    startDate: string;
    endDate: string;
    offerings: EnrollmentsFeature.Types.ViewModels.ClassOffering[];
    enrollments: EnrollmentsFeature.Types.ViewModels.Enrollment[];
  }) => {
    const context = args.dbOrTx ?? (await createContext());

    const { complianceRecords, violationRecords } =
      await SampleData.generateComplianceAndViolationRecords(args);

    await context.transaction(async (tx) => {
      const chunkSize = 30;

      for (let i = 0; i < complianceRecords.length; i += chunkSize) {
        const chunk = complianceRecords.slice(i, i + chunkSize);

        await tx
          .insert(Schema.complianceRecords)
          .values(chunk)
          .onConflictDoNothing();
      }

      for (let i = 0; i < violationRecords.length; i += chunkSize) {
        const chunk = violationRecords.slice(i, i + chunkSize);

        await tx
          .insert(Schema.violationRecords)
          .values(chunk)
          .onConflictDoNothing();
      }
    });
  };
}
