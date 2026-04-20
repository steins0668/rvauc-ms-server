import { Repositories } from "../../repositories";
import { Errors } from "../errors";

export namespace ClassOfferingQuery {
  export class Service {
    private readonly _classOfferingRepo: Repositories.ClassOffering;

    constructor(args: { classOfferingRepo: Repositories.ClassOffering }) {
      this._classOfferingRepo = args.classOfferingRepo;
    }

    /**
     * @description
     * Fetches scheduled class offerings (with class + professor) for a user.
     *
     * Filters by date, term, role, and scope:
     * - "today": offerings on the given date
     * - "term": all offerings in the term
     *
     * Results are ordered by start time (ascending).
     * Uses provided transaction if available.
     */
    async getScheduledOfferings(
      args: Parameters<Repositories.ClassOffering["getScheduledOfferings"]>[0],
    ) {
      try {
        return await this._classOfferingRepo.getScheduledOfferings(args);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_offerings` table.",
          err,
        });
      }
    }

    /**
     * @description
     * Retrieves the current class offering for a provided date, term id, and user id.
     *
     * Executes varying behaviors depending on role and mode.
     * 1. Executing with a professor role will include a subquery to `classes` matching professor id and term id.
     * 2. Executing with a student role will include a subquery to `enrollments` matching student id.
     * 3. Executing with `now` mode will retrieve an ongoing offering.
     * 4. Executing with `now-or-next` mode will retrieve either an ongoing offering or the next one in schedule.
     * Throws if no class offering is found.
     */
    async ensureActiveOffering(
      args: Parameters<Repositories.ClassOffering["getActiveOffering"]>[0],
    ) {
      const offering = await this.getActiveOffering(args);
      if (!offering)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_OFFERING_NOT_FOUND_ERROR",
          message: "The specified class offering was not found.",
        });

      return offering;
    }

    /**
     * @description
     * Retrieves the current class offering for a provided date, term id, and user id.
     *
     * Executes varying behaviors depending on role and mode.
     * 1. Executing with a professor role will include a subquery to `classes` matching professor id and term id.
     * 2. Executing with a student role will include a subquery to `enrollments` matching student id.
     * 3. Executing with `now` mode will retrieve an ongoing offering.
     * 4. Executing with `now-or-next` mode will retrieve either an ongoing offering or the next one in schedule.
     */
    async getActiveOffering(
      args: Parameters<Repositories.ClassOffering["getActiveOffering"]>[0],
    ) {
      try {
        return await this._classOfferingRepo.getActiveOffering(args);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_offerings` table.",
          err,
        });
      }
    }

    /**
     * @description
     * Retrieves a list of offerings (w/ id, class id, start time, and end time) for a provided week day and term id.
     */
    async getMinimalShapesForWeekday(
      args: Parameters<
        Repositories.ClassOffering["getMinimalShapesForWeekday"]
      >[0],
    ) {
      try {
        return await this._classOfferingRepo.getMinimalShapesForWeekday(args);
      } catch (err) {
        throw Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_offerings` table.",
          err,
        });
      }
    }
  }
}
