import { Schemas } from "./schemas";
import { ResultBuilder } from "../../../utils";
import { Errors } from "./errors";
import { Utils } from "./utils";
import { Types } from "./types";

export namespace Services {
  export namespace Notification {
    export async function pushNotification(body: Schemas.PushNotification) {
      const parsed = Schemas.pushNotification.strip().safeParse(body);

      if (!parsed.success)
        return ResultBuilder.fail(
          Errors.Notification.normalizeError({
            name: "NOTIFICATION_INVALID_SCHEMA_ERROR",
            message: "Arguments do not satisfy the provided schema.",
            err: parsed.error,
          })
        );

      type ResponseType = Types.NotificationMicroservice.Response.Union<null>;
      const result = await Utils.notifClient.post<ResponseType>(
        "/notifications/push-notifications/send-firebase-notification",
        body
      );

      const { success, message } = result.data;

      return success
        ? ResultBuilder.success(message)
        : ResultBuilder.fail(
            new Errors.Notification.ErrorClass({
              name: "NOTIFICATION_INVALID_SCHEMA_ERROR",
              message: message ?? "Failed sending notification.",
            })
          );
    }
  }
}
