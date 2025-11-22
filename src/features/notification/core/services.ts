import { Schemas } from "./schemas";
import { ResultBuilder } from "../../../utils";
import { Errors } from "./errors";
import { Utils } from "./utils";
import { Types } from "./types";

export namespace Services {
  export namespace Api {
    export async function clearNotifications(args: { userId: number }) {
      const url = "/notifications/clear-notifications/" + args.userId;

      try {
        const result = await Utils.notifClient.delete(url);

        const { success, message } = result.data;

        return success
          ? ResultBuilder.success(message)
          : ResultBuilder.fail(
              new Errors.Notification.ErrorClass({
                name: "NOTIFICATION_FAILED_CLEARING_NOTIFICATIONS_ERROR",
                message: message ?? "Failed clearing notifications.",
              })
            );
      } catch (err) {
        return ResultBuilder.fail(
          Errors.Notification.normalizeError({
            name: "NOTIFICATION_FAILED_CLEARING_NOTIFICATIONS_ERROR",
            message: "Failed clearing notifications",
            err,
          })
        );
      }
    }

    export async function getNotifications(args: { userId: number }) {
      const url = "/notifications/get-notifications/" + args.userId;

      try {
        const result = await Utils.notifClient.get(url);

        const { success, message } = result.data;

        return success
          ? ResultBuilder.success(
              result.data.result as Schemas.PushNotification
            )
          : ResultBuilder.fail(
              new Errors.Notification.ErrorClass({
                name: "NOTIFICATION_FAILED_GETTING_NOTIFICATIONS_ERROR",
                message: message ?? "Failed getting notifications.",
              })
            );
      } catch (err) {
        return ResultBuilder.fail(
          Errors.Notification.normalizeError({
            name: "NOTIFICATION_FAILED_GETTING_NOTIFICATIONS_ERROR",
            message: "Failed getting notifications",
            err,
          })
        );
      }
    }

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

      try {
        const result = await Utils.notifClient.post(
          "/notifications/send-firebase-notification",
          body
        );

        const { success, message } = result.data;

        return success
          ? ResultBuilder.success(message)
          : ResultBuilder.fail(
              new Errors.Notification.ErrorClass({
                name: "NOTIFICATION_FAILED_SENDING_NOTIFICATION_ERROR",
                message: message ?? "Failed sending notification.",
              })
            );
      } catch (err) {
        return ResultBuilder.fail(
          Errors.Notification.normalizeError({
            name: "NOTIFICATION_FAILED_SENDING_NOTIFICATION_ERROR",
            message: "Failed sending notification",
            err,
          })
        );
      }
    }

    export async function registerDevice(args: {
      userId: number;
      deviceToken: string;
    }) {
      try {
        const result = await Utils.notifClient.post(
          "/auth/registration/register",
          args
        );

        const { success, message } = result.data;

        return success
          ? ResultBuilder.success(message)
          : ResultBuilder.fail(
              new Errors.Notification.ErrorClass({
                name: "NOTIFICATION_FAILED_REGISTERING_USER_ERROR",
                message: message ?? "Failed registering user.",
              })
            );
      } catch (err) {
        return ResultBuilder.fail(
          Errors.Notification.normalizeError({
            name: "NOTIFICATION_FAILED_REGISTERING_USER_ERROR",
            message: "Failed registering user",
            err,
          })
        );
      }
    }
  }
}
