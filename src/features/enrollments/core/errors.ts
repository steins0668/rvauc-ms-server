import { BaseError } from "../../../error";
import { Exhaustive } from "../../../types";
import { isError, StatusCode } from "../../../utils";

export namespace Errors {
  export namespace EnrollmentData {
    export type Database =
      | "ENROLLMENT_DATA_QUERY_ERROR"
      | "ENROLLMENT_DATA_STORE_ERROR"
      | "ENROLLMENT_DATA_UPDATE_ERROR"
      | "ENROLLMENT_DATA_TRANSACTION_ERROR";

    export type EntityNotFound =
      | "ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR"
      | "ENROLLMENT_DATA_CLASS_OFFERING_NOT_FOUND_ERROR"
      | "ENROLLMENT_DATA_CLASS_SESSION_NOT_FOUND_ERROR"
      | "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR"
      | "ENROLLMENT_DATA_STUDENT_NOT_FOUND_ERROR"
      | "ENROLLMENT_DATA_TERM_NOT_FOUND_ERROR";

    export type DomainState =
      | "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR"
      | "ENROLLMENT_DATA_NO_FACE_TO_FACE_CLASS_ERROR"
      | "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR"
      | "ENROLLMENT_DATA_NO_CLASS_LIST_ERROR"
      | "ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR"
      | "ENROLLMENT_DATA_STUDENT_NOT_ENROLLED_ERROR";

    export type SystemFailure =
      | "ENROLLMENT_DATA_INTERNAL_ERROR"
      | "ENROLLMENT_DATA_SYSTEM_ERROR"
      | "ENROLLMENT_DATA_TERM_RESOLUTION_ERROR";

    export type InputValidation =
      | "ENROLLMENT_DATA_INVALID_SEMESTER_DATE_ERROR"
      | "ENROLLMENT_DATA_INVALID_USER_INPUT_ERROR";

    export type Authorization =
      | "ENROLLMENT_DATA_FORBIDDEN_ERROR"
      | "ENROLLMENT_DATA_ROOM_MISMATCH_ERROR";

    export type ApplicationFailure = "ENROLLMENT_DATA_DTO_CONVERSION_ERROR";

    export type ErrorName =
      | Database
      | EntityNotFound
      | DomainState
      | SystemFailure
      | InputValidation
      | ApplicationFailure
      | Authorization;

    export class ErrorClass extends BaseError<ErrorName> {}

    export const statusCodeMap: Exhaustive<ErrorName> = {
      ENROLLMENT_DATA_CLASS_NOT_FOUND_ERROR: 404,
      ENROLLMENT_DATA_CLASS_OFFERING_NOT_FOUND_ERROR: 404,
      ENROLLMENT_DATA_CLASS_SESSION_NOT_FOUND_ERROR: 404,
      ENROLLMENT_DATA_DTO_CONVERSION_ERROR: 500,
      ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR: 404,
      ENROLLMENT_DATA_INTERNAL_ERROR: 500,
      ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR: 404,
      ENROLLMENT_DATA_NO_CLASS_LIST_ERROR: 404,
      ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR: 404,
      ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR: 503, //  temporary issue
      ENROLLMENT_DATA_QUERY_ERROR: 500,
      ENROLLMENT_DATA_STORE_ERROR: 500,
      ENROLLMENT_DATA_STUDENT_NOT_ENROLLED_ERROR: 404,
      ENROLLMENT_DATA_STUDENT_NOT_FOUND_ERROR: 404,
      ENROLLMENT_DATA_SYSTEM_ERROR: 500,
      ENROLLMENT_DATA_TERM_NOT_FOUND_ERROR: 404,
      ENROLLMENT_DATA_TERM_RESOLUTION_ERROR: 503,
      ENROLLMENT_DATA_TRANSACTION_ERROR: 500,
      ENROLLMENT_DATA_UPDATE_ERROR: 500,

      ENROLLMENT_DATA_NO_FACE_TO_FACE_CLASS_ERROR: 409,

      ENROLLMENT_DATA_INVALID_SEMESTER_DATE_ERROR: 400,
      ENROLLMENT_DATA_INVALID_USER_INPUT_ERROR: 400,

      ENROLLMENT_DATA_FORBIDDEN_ERROR: 403,
      ENROLLMENT_DATA_ROOM_MISMATCH_ERROR: 403,
    };

    export function collapseError(args: {
      name: ErrorName;
      message: string;
      err: unknown;
    }) {
      return new ErrorClass({
        name: args.name,
        message: args.message,
        cause: args.err,
      });
    }

    export function normalizeError<E extends ErrorName>({
      name,
      message,
      err,
    }: {
      name: E;
      message: string;
      err: unknown;
    }) {
      if (isError(ErrorClass, err)) return err;

      return new ErrorClass({
        name,
        message,
        cause:
          err instanceof Error
            ? {
                name: err.name,
                message: err.message,
                stack: err.stack,
              }
            : err,
      });
    }

    export function translateError<E extends ErrorName>(args: {
      fallback: {
        name: E;
        message: string;
        err: unknown;
      };
      map: (
        err: ErrorClass,
        create: (args: {
          name: ErrorName;
          message: string;
          cause?: unknown;
        }) => ErrorClass,
      ) => ErrorClass | undefined;
    }): ErrorClass {
      const normalized = normalizeError(args.fallback);

      const create = (args: {
        name: ErrorName;
        message: string;
        cause?: unknown;
      }) => new ErrorClass(args);

      const mapped = args.map(normalized, create);

      return mapped ?? normalized;
    }

    export function internalError(message?: string) {
      return new ErrorClass({
        name: "ENROLLMENT_DATA_INTERNAL_ERROR",
        message: message ?? "Something went wrong.",
      });
    }

    export function dtoConversionError(args: {
      message?: string;
      err?: unknown;
    }) {
      return new ErrorClass({
        name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
        message: args.message ?? "Failed mapping data to dto.",
        cause: args.err,
      });
    }

    export function getErrStatusCode(error: ErrorClass) {
      return StatusCode.fromError({
        errorName: error.name,
        statusCodeMap,
      });
    }
  }
}
