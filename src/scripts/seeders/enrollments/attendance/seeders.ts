import { createContext, DbOrTx } from "../../../../db/create-context";
import { Schema } from "../../../../models";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedAttendanceRecords = async (dbOrTx?: DbOrTx | undefined) => {
    const records = SampleData.generateAttendanceRecords({
      dbOrTx,
      startDate: "2025-12-01",
      endDate: "2025-12-23",
    });

    const context = dbOrTx ?? (await createContext());

    const chunkSize = 30;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      await context.insert(Schema.attendanceRecords).values(chunk);
    }
  };
}
