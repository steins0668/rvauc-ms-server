import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { ResultBuilder } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Data } from "../data";

export namespace TermData {
  export async function create() {
    const context = await createContext();
    const termRepo = new Repositories.Term(context);
    return new Service(termRepo);
  }

  export class Service {
    private readonly _termRepo: Repositories.Term;

    constructor(termRepo: Repositories.Term) {
      this._termRepo = termRepo;
    }

    public async getCurrentTerm(args?: { dbOrTx?: DbOrTx | undefined }) {
      const { yearStart, yearEnd, semester } = Data.Env.getAcademicYearConfig();

      try {
        const inserted = await this._termRepo.execInsert({
          dbOrTx: args?.dbOrTx,
          fn: async ({ table: t, insert }) =>
            insert
              .values({
                yearStart,
                yearEnd,
                semester,
              })
              .onConflictDoUpdate({
                target: [t.yearStart, t.yearEnd, t.semester],
                set: { yearEnd },
              })
              .returning()
              .then((result) => result[0]),
        });

        if (!inserted) throw Error("The returning value is undefined");

        return ResultBuilder.success(inserted);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_INSERT_ERROR",
            message: "Failed inserting in `terms` table.",
            err,
          })
        );
      }
    }
  }
}
