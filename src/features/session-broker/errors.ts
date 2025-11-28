import { BaseError } from "../../error";
import { Exhaustive } from "../../types";
import { isError, StatusCode } from "../../utils";

export namespace Errors {
  export namespace Session {
    export type ErrorName =
      | "SESSION_INVALID_TOKEN_ERROR"
      | "SESSION_RETRIEVE_TOKEN_ERROR"
      | "SESSION_SIGN_IN_ERROR"
      | "SESSION_STORE_TOKEN_ERROR";

    export class ErrorClass extends BaseError<ErrorName> {}

    export const statusCodeMap: Exhaustive<ErrorName> = {
      SESSION_INVALID_TOKEN_ERROR: 403,
      SESSION_RETRIEVE_TOKEN_ERROR: 500,
      SESSION_SIGN_IN_ERROR: 500,
      SESSION_STORE_TOKEN_ERROR: 500,
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

  export namespace Config {
    export type ErrorName = "CONFIG_STATION_TOKEN_MISCONFIGURED_ERROR";

    export class ErrorClass extends BaseError<ErrorName> {}

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
}
