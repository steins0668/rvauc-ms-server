import { createContext, DbOrTx } from "../../../../db/create-context";
import { Schema } from "../../../../models";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedAttendanceRecords = async (args: {
    dbOrTx?: DbOrTx | undefined;
    startDate: string;
    endDate: string;
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
