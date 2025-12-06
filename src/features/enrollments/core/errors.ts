import { BaseError } from "../../../error";
import { Exhaustive } from "../../../types";
import { isError, StatusCode } from "../../../utils";

export namespace Errors {
  export namespace EnrollmentData {
    export type ErrorName =
      | "ENROLLMENT_DATA_DTO_CONVERSION_ERROR"
      | "ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR"
      | "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR"
      | "ENROLLMENT_DATA_QUERY_ERROR"
      | "ENROLLMENT_DATA_STORE_ERROR";

    export class ErrorClass extends BaseError<ErrorName> {}

    export const statusCodeMap: Exhaustive<ErrorName> = {
      ENROLLMENT_DATA_DTO_CONVERSION_ERROR: 500,
      ENROLLMENT_DATA_NO_CLASS_TODAY_ERROR: 404,
      ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR: 404,
      ENROLLMENT_DATA_QUERY_ERROR: 500,
      ENROLLMENT_DATA_STORE_ERROR: 500,
    };

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
    export function getErrStatusCode(error: ErrorClass) {
      return StatusCode.fromError({
        errorName: error.name,
        statusCodeMap,
      });
    }
  }
}
