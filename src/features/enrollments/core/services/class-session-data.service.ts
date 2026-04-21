import { createContext, TxContext } from "../../../../db/create-context";
import { RepositoryUtil, ResultBuilder } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { ClassSessionQuery } from "./class-session-query.service";

export namespace ClassSessionData {
  export async function create() {
    const context = await createContext();
    const classSessionRepo = new Repositories.ClassSession(context);
    return new Service({
      classSessionQuery: new ClassSessionQuery.Service({ classSessionRepo }),
    });
  }

  type Constraints = { limit: number; page: number };
  type QueryArgs = {
    constraints?: Partial<Constraints> | undefined;
    tx?: TxContext | undefined;
  };

  export class Service {
    private readonly _classSessionQuery: ClassSessionQuery.Service;

    constructor(args: { classSessionQuery: ClassSessionQuery.Service }) {
      this._classSessionQuery = args.classSessionQuery;
    }

    async getAllSessionsUntilDate(
      args: {
        values: {
          date: Date;
          classId: number;
          professorId: number;
          termId: number;
        };
      } & QueryArgs,
    ) {
      const { constraints } = args;
      try {
        const result = await this._classSessionQuery.getAllUntilDate({
          values: args.values,
          constraints: {
            limit: RepositoryUtil.resolveLimit(constraints),
            offset: RepositoryUtil.resolveOffsetFromPage(constraints),
          },
          tx: args.tx,
        });

        const dto: Schemas.Dto.ClassSession[] = result;

        return ResultBuilder.success({ sessions: dto });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.collapseError({
            name: "ENROLLMENT_DATA_INTERNAL_ERROR",
            message: "Failed getting sessions.",
            err,
          }),
        );
      }
    }
  }
}
