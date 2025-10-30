import { StatusCode as Map } from "../data";
import { isError, StatusCode } from "../utils";
import { BaseError } from "./base.error";

export namespace RequestValidation {
  export type ErrorName =
    | "REQUEST_VALIDATION_INVALID_SCHEMA_ERROR"
    | "REQUEST_VALIDATION_INVALID_FIELD_VALUE_ERROR";

  export class ErrorClass extends BaseError<ErrorName> {}

  export function getErrStatusCode(error: ErrorClass) {
    return StatusCode.fromError({
      errorName: error.name,
      statusCodeMap: Map.RequestSchemaError,
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
}
