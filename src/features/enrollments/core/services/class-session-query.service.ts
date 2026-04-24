import { Repositories } from "../../repositories";
import { Data } from "../data";
import { Errors } from "../errors";

export namespace ClassSessionQuery {
  export class Service {
    private readonly _classSessionRepo: Repositories.ClassSession;

    constructor(args: { classSessionRepo: Repositories.ClassSession }) {
      this._classSessionRepo = args.classSessionRepo;
    }

    /**
     * @description
     * Retrieves the first class session from the table arranged by start time ms in descending order.
     */
    async getLatest(
      args: Parameters<Repositories.ClassSession["getLatest"]>[0],
    ) {
      try {
        return await this._classSessionRepo.getLatest(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }
    }

    /**
     * @description
     * Retrieves all sessions for a class, term, and professor up until a provided date.
     */
    async getAllUntilDate(
      args: Parameters<Repositories.ClassSession["getAllUntilDate"]>[0],
    ) {
      try {
        return await this._classSessionRepo.getAllUntilDate(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }
    }

    /**
     * @description
     * Retrieves the professor's currently ongoing class,
     * or the next scheduled class depending on the requested mode.
     * Includes class, course, and schedule details.
     */
    async getProfessorActiveClass(
      args: Parameters<Repositories.ClassSession["getProfessorActiveClass"]>[0],
    ) {
      let result;
      try {
        result = await this._classSessionRepo.getProfessorActiveClass(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }

      Service.ensureResult(result);

      return result;
    }

    /**
     * @description
     * Retrieves the student's currently ongoing class,
     * or the next scheduled class depending on the requested mode.
     * Includes class, course, schedule, and professor details.
     */
    async getStudentActiveClass(
      args: Parameters<Repositories.ClassSession["getStudentActiveClass"]>[0],
    ) {
      let result;
      try {
        result = await this._classSessionRepo.getStudentActiveClass(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }

      Service.ensureResult(result);

      return result;
    }

    /**
     * @description
     * Retrieves the current active session based on two modes:
     * 1. `now` - The session must be ongoing.
     * 2. `now-or-next` - The session must be ongoing OR is scheduled next for the current day.
     * Throws if session is not found.
     * Throws if session is cancelled.
     */
    async ensureOfferingActiveSessionNotCancelled(
      args: Parameters<
        Repositories.ClassSession["getOfferingActiveSession"]
      >[0],
    ) {
      const session = await this.ensureOfferingActiveSession(args);

      if (session.status === Data.classSessionStatus.cancelled)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
          message: "The specified class session was cancelled.",
        });

      return session;
    }

    /**
     * @description
     * Retrieves the current active session based on two modes:
     * 1. `now` - The session must be ongoing.
     * 2. `now-or-next` - The session must be ongoing OR is scheduled next for the current day.
     * Throws if session is not found.
     */
    async ensureOfferingActiveSession(
      args: Parameters<
        Repositories.ClassSession["getOfferingActiveSession"]
      >[0],
    ) {
      const session = await this.getOfferingActiveSession(args);

      if (!session) throw Service.sessionNotFoundError();

      return session;
    }

    /**
     * @description
     * Retrieves the current active session based on two modes:
     * 1. `now` - The session must be ongoing.
     * 2. `now-or-next` - The session must be ongoing OR is scheduled next for the current day.
     */
    async getOfferingActiveSession(
      args: Parameters<
        Repositories.ClassSession["getOfferingActiveSession"]
      >[0],
    ) {
      try {
        return await this._classSessionRepo.getOfferingActiveSession(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }
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

      if (!session) throw Service.sessionNotFoundError();

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
        throw Service.normalizeQueryError(err);
      }
    }

    /**
     * @description
     * Retrieves a class session with minimal information for operations validation
     */
    async ensureValidSessionForProfessor(
      args: Parameters<
        Repositories.ClassSession["getWithClassForValidation"]
      >[0] & { values: { professorId: number } },
    ) {
      let result;
      try {
        result = await this._classSessionRepo.getWithClassForValidation(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }

      if (!result) throw Service.sessionNotFoundError();

      if (result.class.professorId !== args.values.professorId)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_FORBIDDEN_ERROR",
          message:
            "This professor is not associated with the specified class session.",
        });

      return result;
    }

    /**
     * @description
     * Counts class sessions that match a specified class id and date.
     */
    async countForClassIdAndDate(
      args: Parameters<Repositories.ClassSession["countForClassIdAndDate"]>[0],
    ) {
      try {
        return await this._classSessionRepo.countForClassIdAndDate(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
      }
    }

    private static ensureResult<T>(
      result: T,
    ): asserts result is NonNullable<T> {
      if (result === undefined) throw Service.sessionNotFoundError();
    }

    private static sessionNotFoundError(msg?: string) {
      const message = msg ?? "The specified class session was not found.";

      return new Errors.EnrollmentData.ErrorClass({
        name: "ENROLLMENT_DATA_CLASS_SESSION_NOT_FOUND_ERROR",
        message,
      });
    }

    private static normalizeQueryError(err: unknown) {
      return Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_QUERY_ERROR",
        message: "Failed querying `class_sessions` table.",
        err,
      });
    }
  }
}
