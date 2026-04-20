import { createContext, TxContext } from "../../../../db/create-context";
import { Repositories } from "../../repositories";
import { Data } from "../data";
import { Errors } from "../errors";

export namespace TermResolver {
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

    public async resolveCurrentTerm(args?: { tx?: TxContext | undefined }) {
      const { yearStart, yearEnd, semester } = Data.Env.getAcademicYearConfig();

      let term;

      try {
        term = await this._termRepo.execInsert({
          dbOrTx: args?.tx,
          fn: async ({ table: t, insert }) =>
            insert
              .values({
                yearStart,
                yearEnd,
                semester,
              })
              .onConflictDoUpdate({
                target: [t.yearStart, t.semester],
                set: { yearEnd },
              })
              .returning()
              .then((result) => result[0]),
        });
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed inserting in `terms` table.",
          err,
        });
      }

      if (!term)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_TERM_RESOLUTION_ERROR",
          message: "Failed resolving term.",
        });

      return term;
    }
  }
}
