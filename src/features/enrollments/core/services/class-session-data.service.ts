import { createContext, TxContext } from "../../../../db/create-context";
import { TimeUtil } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";

export namespace ClassSessionData {
  export async function create() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    return new Service({ classOfferingRepo, classSessionRepo });
  }

  export class Service {
    private readonly _classOfferingRepo: Repositories.ClassOffering;
    private readonly _classSessionRepo: Repositories.ClassSession;

    constructor(args: {
      classOfferingRepo: Repositories.ClassOffering;
      classSessionRepo: Repositories.ClassSession;
    }) {
      this._classOfferingRepo = args.classOfferingRepo;
      this._classSessionRepo = args.classSessionRepo;
    }

    async getWithEnrollmentsForDate(args: {
      date: Date;
      tx?: TxContext | undefined;
    }) {
      const datePh = TimeUtil.toPhDate(args.date);

      try {
        return await this._classSessionRepo.execQuery({
          dbOrTx: args.tx,
          fn: async (query) =>
            query.findMany({
              where: (cs, { eq }) => eq(cs.datePh, datePh),
              orderBy: (cs, { asc }) => asc(cs.startTimeMs),
              columns: { id: true, startTimeMs: true, endTimeMs: true },
              with: {
                classOffering: {
                  columns: { id: true, classId: true },
                  with: {
                    enrollments: {
                      columns: { id: true, studentId: true, status: true },
                    },
                  },
                },
              },
            }),
        });
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: `Failed to retrieve sessions with enrollments for date: ${args.date}.`,
          err,
        });
      }
    }
  }
}
