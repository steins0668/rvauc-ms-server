import { Schemas } from "./schemas";
import { ResultBuilder } from "../../../utils";
import { Errors } from "./errors";
import { Utils } from "./utils";
import { Types } from "./types";

export namespace Services {
  export namespace Api {
    export async function clearNotifications(args: { userId: number }) {
      type ResponseType = Types.NotificationMicroservice.Response.Union<null>;

      try {
        const result = await Utils.notifClient.post(
          "/notifications/clear-notifications",
          args
        );

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
      type ResponseType =
        Types.NotificationMicroservice.Response.Union<Schemas.PushNotification>;

      try {
        const result = await Utils.notifClient.post<ResponseType>(
          "/notifications/get-notifications",
          args
        );

        const { success, message } = result.data;

        return success
          ? ResultBuilder.success(message)
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

      type ResponseType = Types.NotificationMicroservice.Response.Union<null>;

      try {
        const result = await Utils.notifClient.post<ResponseType>(
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
      type ResponseType = Types.NotificationMicroservice.Response.Union<{
        userId: number;
      }>;

      try {
        const result = await Utils.notifClient.post<ResponseType>(
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
