import { Repositories } from "../../repositories";
import { Errors } from "../errors";

export namespace ClassQuery {
  export class Service {
    private readonly _classRepo: Repositories.Class;

    constructor(args: { classRepo: Repositories.Class }) {
      this._classRepo = args.classRepo;
    }

    async getProfessorClassesWithSchedule(
      args: Parameters<
        Repositories.Class["getProfessorClassesWithSchedule"]
      >[0],
    ) {
      try {
        return await this._classRepo.getProfessorClassesWithSchedule(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }
    }

    private static normalizeQueryError(err: unknown) {
      return Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_QUERY_ERROR",
        message: "Failed querying `classes` table.",
        err,
      });
    }
  }
}
