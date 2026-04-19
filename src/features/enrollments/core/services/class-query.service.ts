import { DbOrTx } from "../../../../db/create-context";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";

export namespace ClassQuery {
  export class Service {
    private readonly _classRepo: Repositories.Class;

    constructor(args: { classRepo: Repositories.Class }) {
      this._classRepo = args.classRepo;
    }

    async ensureClassWithCourse(
      args: Pick<
        NonNullable<Parameters<Repositories.Class["queryWithCourse"]>[0]>,
        "orderBy" | "where" | "dbOrTx"
      >,
    ) {
      const cls = await this.getClassesWithCourse({
        constraints: { limit: 1 },
        ...args,
      }).then((r) => r[0]);

      if (!cls)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
          message: "The specified class was not found.",
        });

      return cls;
    }

    async getClassesWithCourse(
      args: NonNullable<Parameters<Repositories.Class["queryWithCourse"]>[0]>,
    ) {
      try {
        return await this._classRepo.queryWithCourse(args);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `classes` table",
          err,
        });
      }
    }
  }
}
