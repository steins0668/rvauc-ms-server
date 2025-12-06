import { BaseError } from "../../error";
import { Exhaustive } from "../../types";
import { isError, StatusCode } from "../../utils";

export namespace Errors {
  export namespace ComplianceData {
    export type ErrorName =
      | "COMPLIANCE_DATA_DTO_CONVERSION_ERROR"
      | "COMPLIANCE_DATA_EXISTING_RECORD_ERROR"
      | "COMPLIANCE_DATA_QUERY_RECORD_ERROR"
      | "COMPLIANCE_DATA_STORE_RECORD_ERROR";

    export class ErrorClass extends BaseError<ErrorName> {}

    export const statusCodeMap: Exhaustive<ErrorName> = {
      COMPLIANCE_DATA_DTO_CONVERSION_ERROR: 500,
      COMPLIANCE_DATA_EXISTING_RECORD_ERROR: 409,
      COMPLIANCE_DATA_QUERY_RECORD_ERROR: 500,
      COMPLIANCE_DATA_STORE_RECORD_ERROR: 500,
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
