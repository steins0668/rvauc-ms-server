import { isError } from "../utils";
import { BaseError } from "./base.error";

export namespace DbAccess {
  export type ErrorName =
    | "DB_ACCESS_DELETE_ERROR"
    | "DB_ACCESS_EXCEEDED_MAX_FETCH_RETRIES_ERROR"
    | "DB_ACCESS_EMPTY_TABLE_ERROR"
    | "DB_ACCESS_INSERT_ERROR"
    | "DB_ACCESS_QUERY_ERROR"
    | "DB_ACCESS_UPDATE_ERROR";
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
