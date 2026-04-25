import { TxContext } from "../../../../db/create-context";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";

const { roles } = Auth.Core.Data.Records;
export namespace ClassQuery {
  export class Service {
    private readonly _classRepo: Repositories.Class;

    constructor(args: { classRepo: Repositories.Class }) {
      this._classRepo = args.classRepo;
    }

    /**
     * @description
     * Validates access of a student or professor to a class.
     */
    async ensureClassAccess(args: {
      values: { classId: number; userId: number };
      role: keyof typeof roles;
      tx?: TxContext | undefined;
    }) {
      try {
        const accessCheckers = {
          [roles.student]: this._classRepo.getStudentEnrolledClass,
          [roles.professor]: this._classRepo.getProfessorOwnedClass,
        };

        const checker = accessCheckers[args.role];

        if (!checker)
          throw new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_FORBIDDEN_ERROR",
            message: `This ${args.role} cannot access this resource.`,
          });

        const hasAccess = await checker(args);

        if (!hasAccess)
          throw new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_FORBIDDEN_ERROR",
            message: `This ${args.role} cannot access this class.`,
          });
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }
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
