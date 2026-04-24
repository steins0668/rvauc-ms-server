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
     * Retrieves enrollments using a projection-based SQL query (explicit joins),
     * returning a flattened UI-ready dataset with student information included.
     *
     * This is a VIEW-LEVEL query intended for:
     * - list screens with pagination
     * - deterministic sorting (e.g., alphabetical ordering)
     * - API responses requiring stable, minimal, serializable shapes
     *
     * Key properties:
     * - Flat structure (no nested relations)
     * - Explicit joins (no ORM graph hydration)
     * - Optimized for sorting across joined columns
     *
     * Not suitable for:
     * - domain modeling
     * - relational traversal
     * - business logic that depends on full entity graphs
     */
    async getEnrollmentsWithStudentDetails(
      args: NonNullable<
        Parameters<Repositories.Enrollment["getEnrollmentStudentListView"]>[0]
      >,
    ) {
      let enrollments;

      try {
        enrollments =
          await this._enrollmentRepo.getEnrollmentStudentListView(args);
      } catch (err) {
        throw Service.normalizeQueryError({
          message: "Failed retrieving enrollments for class.",
          err,
        });
      }

      let totalEnrollments;

      try {
        totalEnrollments = await this._enrollmentRepo.countEnrollments({
          where: args.where,
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        throw Service.normalizeQueryError({
          message: "Failed counting enrollments for class.",
          err,
        });
      }

      return { enrollments: [...enrollments], totalEnrollments };
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
     */
    async ensureForClassAndStudent(args: {
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

      return enrollment;
    }

    /**
     * @description
     * Retrieves a single enrollment (limit 1) using the projection-based enrollment query
     * with student details included.
     *
     * This is a convenience method for scenarios where:
     * - a specific enrollment must be validated or fetched
     * - full student context is still required
     *
     * Throws if no matching enrollment is found.
     */
    async ensureEnrollmentsWithStudentGraph(
      args: Pick<
        NonNullable<
          Parameters<Repositories.Enrollment["queryWithStudentDetails"]>[0]
        >,
        "where" | "orderBy" | "dbOrTx"
      >,
    ) {
      const enrollment = await this.getEnrollmentsWithStudentGraph({
        ...args,
        constraints: { limit: 1 },
      }).then((r) => r[0]);

      if (!enrollment) throw Service.enrollmentNotFoundError();

      return enrollment;
    }

    /**
     * @description
     * Retrieves enrollments using ORM relational graph hydration.
     * Returns nested entities (student → user → department → college).
     *
     * This is a DOMAIN-LEVEL query intended for:
     * - service-layer logic requiring rich entity relationships
     * - workflows that operate on full object graphs
     *
     * Key properties:
     * - Nested relational structure
     * - ORM-managed joins
     * - Developer-friendly domain modeling
     *
     * Not suitable for:
     * - list views requiring strict ordering across joins
     * - UI pagination-heavy endpoints
     */
    async getEnrollmentsWithStudentGraph(
      args: NonNullable<
        Parameters<Repositories.Enrollment["queryWithStudentDetails"]>[0]
      >,
    ) {
      try {
        return await this._enrollmentRepo.queryWithStudentDetails(args);
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

      if (e.status !== Data.enrollmentStatus.enrolled)
        throw new Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_STUDENT_NOT_ENROLLED_ERROR",
          message: "The specified student is not enrolled.",
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
