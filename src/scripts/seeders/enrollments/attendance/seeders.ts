import { createContext, DbOrTx } from "../../../../db/create-context";
import { Schema } from "../../../../models";
import { Enrollments as EnrollmentsFeature } from "../../../../features/enrollments";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedAttendanceRecords = async (args: {
    startDate: string;
    endDate: string;
    classes: EnrollmentsFeature.Types.ViewModels.Class[];
    classSessions: EnrollmentsFeature.Types.ViewModels.ClassSession[];
    classOfferings: EnrollmentsFeature.Types.ViewModels.ClassOffering[];
    enrollments: EnrollmentsFeature.Types.ViewModels.Enrollment[];
    dbOrTx?: DbOrTx | undefined;
  }) => {
    const records = SampleData.generateAttendanceRecords(args);

    const context = args.dbOrTx ?? (await createContext());

    const chunkSize = 30;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      await context.insert(Schema.attendanceRecords).values(chunk);
    }
  };
}
