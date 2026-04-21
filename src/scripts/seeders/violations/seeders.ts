import { createContext, DbOrTx } from "../../../db/create-context";
import { Schema } from "../../../models";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedViolationStatuses = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.violationStatuses)
      .values(SampleData.violationStatuses)
      .onConflictDoNothing()
      .returning();
  };
}
