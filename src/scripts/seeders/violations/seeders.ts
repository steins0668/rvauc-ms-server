import { createContext, DbOrTx } from "../../../db/create-context";
import { Violation } from "../../../features/violation";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedViolationStatuses = async (dbOrTx?: DbOrTx | undefined) => {
    const violationStatusRepo = new Violation.Repositories.ViolationStatus(
      await createContext(),
    );

    return await violationStatusRepo.execInsert({
      dbOrTx,
      fn: async (insert) =>
        insert
          .values(SampleData.violationStatuses)
          .onConflictDoNothing()
          .returning(),
    });
  };
}
