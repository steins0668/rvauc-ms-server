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
     * Retrieves all scheduled offerings for an enrollment in a week.
     */
    async getWeeklyScheduleForClass(
      args: Parameters<
        Repositories.ClassOffering["getWeeklyScheduleForClass"]
      >[0],
    ) {
      try {
        return await this._classOfferingRepo.getWeeklyScheduleForClass(args);
      } catch (err) {
        throw Service.normalizeQueryError(err);
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
        throw Service.normalizeQueryError(err);
      }
    }

    private static normalizeQueryError(err: unknown) {
      return Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_QUERY_ERROR",
        message: "Failed querying `class_offerings` table.",
        err,
      });
    }
  }
}
