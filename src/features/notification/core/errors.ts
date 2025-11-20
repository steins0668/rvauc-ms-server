import { BaseError } from "../../../error";
import { isError } from "../../../utils";

export namespace Errors {
  export namespace Notification {
    export type ErrorName =
      | "NOTIFICATION_FAILED_GETTING_NOTIFICATIONS_ERROR"
      | "NOTIFICATION_FAILED_REGISTERING_USER_ERROR"
      | "NOTIFICATION_FAILED_SENDING_NOTIFICATION_ERROR"
      | "NOTIFICATION_INVALID_SCHEMA_ERROR";

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
