import { Repositories } from "../../repositories";
import { Errors } from "../errors";

export namespace ClassSessionQuery {
  export class Service {
    private readonly _classSessionRepo: Repositories.ClassSession;

    constructor(args: { classSessionRepo: Repositories.ClassSession }) {
      this._classSessionRepo = args.classSessionRepo;
    }

    /**
     * @description
     * Retrieves a class session with its class and class offering relations.
     * Throws if not found.
     */
    async ensureWithClassContext(
      args: Pick<
        NonNullable<
          Parameters<Repositories.ClassSession["getWithClassAndOffering"]>[0]
        >,
        "where" | "orderBy" | "dbOrTx"
      >,
    ) {
      const session = await this.getWithClassContext({
        constraints: { limit: 1 },
        ...args,
      }).then((r) => r[0]);

      if (!session)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_SESSION_NOT_FOUND_ERROR",
          message: "The specified class session does not exist.",
        });

      return session;
    }

    /**
     * @description
     * Retrieves class sessions with its class and class offering relations.
     */
    async getWithClassContext(
      args: NonNullable<
        Parameters<Repositories.ClassSession["getWithClassAndOffering"]>[0]
      >,
    ) {
      try {
        return await this._classSessionRepo.getWithClassAndOffering(args);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_sessions` table.",
          err,
        });
      }
    }

    /**
     * @description
     * Retrieves a class session with minimal shape.
     * Throws if not found.
     */
    async ensureMinimalShape(
      args: Pick<
        NonNullable<
          Parameters<Repositories.ClassSession["queryMinimalShape"]>[0]
        >,
        "where" | "orderBy" | "dbOrTx"
      >,
    ) {
      const session = await this.getMinimalShape({
        ...args,
        constraints: { limit: 1 },
      }).then((r) => r[0]);

      if (!session)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_SESSION_NOT_FOUND_ERROR",
          message: "Could not find the specified class session.",
        });

      return session;
    }

    /**
     * @description
     * Retrieves a class session with minimal shape.
     */
    async getMinimalShape(
      args: NonNullable<
        Parameters<Repositories.ClassSession["queryMinimalShape"]>[0]
      >,
    ) {
      try {
        return await this._classSessionRepo.queryMinimalShape(args);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_sessions` table.",
          err,
        });
      }
    }
  }
}
