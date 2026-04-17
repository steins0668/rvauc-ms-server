import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { createContext, TxContext } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { ResultBuilder } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

export namespace ClassSessionData {
  export async function create() {
    const context = await createContext();
    const classRepo = new Repositories.Class(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    return new Service({ classRepo, classSessionRepo });
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    tx?: TxContext | undefined;
  };

  export class Service {
    private readonly _classRepo: Repositories.Class;
    private readonly _classSessionRepo: Repositories.ClassSession;

    constructor(args: {
      classRepo: Repositories.Class;
      classSessionRepo: Repositories.ClassSession;
    }) {
      this._classRepo = args.classRepo;
      this._classSessionRepo = args.classSessionRepo;
    }

    async getProfessorView(
      args: {
        values: { date: Date; classId: number; termId: number };
      } & QueryArgs,
    ) {
      const { date, classId, termId } = args.values;
      const { limit = 6, page = 1 } = args.constraints ?? {};

      const subqueryC = (args: {
        classId: SQLiteColumn;
        termId: number;
        tx?: TxContext | undefined;
      }) => this._classRepo.existsForContext({ ...args, dbOrTx: args.tx });

      try {
        const result = await this.querySessions({
          dbOrTx: args.tx,
          constraints: { limit, offset: (page - 1) * limit },
          orderBy: (cs, { desc }) => desc(cs.startTimeMs),
          where: (cs, { and, eq, exists, lte }) =>
            and(
              exists(subqueryC({ classId: cs.classId, termId, tx: args.tx })),
              eq(cs.classId, classId),
              lte(cs.startTimeMs, date.getTime()),
            ),
        });

        const dto: Schemas.Dto.ClassSession[] = result;

        return ResultBuilder.success({ sessions: dto });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed getting sessions for professor.",
            err,
          }),
        );
      }
    }

    private async querySessions(
      args: Parameters<Repositories.ClassSession["queryMinimalShape"]>[0],
    ) {
      try {
        return await this._classSessionRepo.queryMinimalShape(args);
      } catch (err) {
        throw DbAccess.normalizeError({
          name: "DB_ACCESS_QUERY_ERROR",
          message: "Failed querying `class_sessions` table.",
          err,
        });
      }
    }
  }
}
