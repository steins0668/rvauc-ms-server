import { BaseError } from "../../../../error";
import { Exhaustive } from "../../../../types";
import { isError, StatusCode } from "../../../../utils";

export namespace CustomError {
  export namespace Config {
    export type ErrorName =
      | "AUTH_CONFIG_ENV_TKN_SECRET_ERROR"
      | "AUTH_CONFIG_COOKIE_CONFIG_ERROR";

    export class ErrorClass extends BaseError<ErrorName> {}

    export const statusCodeMap: Exhaustive<CustomError.Config.ErrorName> = {
      AUTH_CONFIG_COOKIE_CONFIG_ERROR: 500,
      AUTH_CONFIG_ENV_TKN_SECRET_ERROR: 500,
    } as const;

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
