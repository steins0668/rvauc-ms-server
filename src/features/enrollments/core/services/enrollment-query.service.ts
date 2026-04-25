import { DbOrTx } from "../../../../db/create-context";
import { Repositories } from "../../repositories";
import { Data } from "../data";
import { Errors } from "../errors";

export namespace EnrollmentQuery {
  export class Service {
    private readonly _enrollmentRepo: Repositories.Enrollment;

    constructor(args: { enrollmentRepo: Repositories.Enrollment }) {
      this._enrollmentRepo = args.enrollmentRepo;
    }

    /**
     * @description
     * Retrieves all enrollments of a student for a term.
     * Additionally includes details of scheduled classes for the provided date and time if available.
     */
    async getEnrollmentsWithSchedule(
      args: Parameters<
        Repositories.Enrollment["getEnrollmentsWithSchedule"]
      >[0],
    ) {
      let r;
      try {
        r = await this._enrollmentRepo.getEnrollmentsWithSchedule(args);
      } catch (err) {
        throw Service.normalizeQueryError({ err });
      }

      return r;
    }

    /**
     * @description
     * Verifies and retrieves a single enrollment for a given class and student pair.
     *
     * This is a strict existence check used for authorization or validation flows,
     * ensuring that the student is officially enrolled in the specified class.
     *
     * Returns minimal enrollment data (no relational graph hydration).
     * Throws if no matching enrollment exists.
     * Throws if enrollment status != enrolled.
     */
    async ensureEnrolledForClassAndStudent(args: {
      values: {
        classId: number;
        studentId: number;
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      let enrollment;

      try {
        enrollment = await this._enrollmentRepo.getForClassAndStudent(args);
      } catch (err) {
        throw Service.normalizeQueryError({ err });
      }

      this.assertValidEnrollment(enrollment);

      if (enrollment.status !== Data.enrollmentStatus.enrolled)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_STUDENT_NOT_ENROLLED_ERROR",
          message: "The specified student is not enrolled.",
        });

      return enrollment;
    }

    /**
     * @description
     * Retrieves an enrollment that is linked to a professor's class.
     * Throws if enrollment is not found.
     */
    async ensureForProfessor(
      args: Parameters<Repositories.Enrollment["getByIdForProfessor"]>[0],
    ) {
      const enrollment = await this.getForProfessor(args);

      if (!enrollment) throw Service.enrollmentNotFoundError();

      return enrollment;
    }

    /**
     * @description
     * Retrieves an enrollment that is linked to a professor's class.
     */
    async getForProfessor(
      args: Parameters<Repositories.Enrollment["getByIdForProfessor"]>[0],
    ) {
      try {
        return await this._enrollmentRepo.getByIdForProfessor(args);
      } catch (err) {
        throw Service.normalizeQueryError({ err });
      }
    }

    /**
     * @description
     * Retrieves a list of enrollment ids for those enrolled in a class id.
     */
    async getEnrolledIdsForClass(
      args: Parameters<Repositories.Enrollment["getEnrolledIdsForClass"]>[0],
    ) {
      try {
        return await this._enrollmentRepo.getEnrolledIdsForClass(args);
      } catch (err) {
        throw Service.normalizeQueryError({ err });
      }
    }

    /**
     * @description
     * Asserts the validity of a queried enrollment. Class, student, and enrollment
     * must all exist for the result to be considered valid.
     */
    private assertValidEnrollment(
      e: Awaited<ReturnType<Repositories.Enrollment["getForClassAndStudent"]>>,
    ): asserts e is {
      id: number;
      classId: number;
      studentId: number;
      status: string;
    } {
      if (!e)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR",
          message: "The specified class does not exist.",
        });

      if (e.studentId === null)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_STUDENT_NOT_FOUND_ERROR",
          message: "The specified student does not exist.",
        });

      if (e.id === null)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR",
          message: "The specified enrollment does not exist.",
        });
    }

    private static enrollmentNotFoundError(msg?: string) {
      const message = msg ?? "The specified enrollment was not found.";

      return new Errors.EnrollmentData.ErrorClass({
        name: "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR",
        message,
      });
    }

    private static normalizeQueryError(args: {
      message?: string;
      err: unknown;
    }) {
      const message = args.message ?? "Failed querying `enrollments` table.";

      return Errors.EnrollmentData.normalizeError({
        name: "ENROLLMENT_DATA_QUERY_ERROR",
        message,
        err: args.err,
      });
    }
  }
}
