import { Schemas } from "./schemas";
import { ResultBuilder } from "../../../utils";
import { Errors } from "./errors";
import { Utils } from "./utils";

export namespace Services {
  export namespace Api {
    export async function clearNotifications(args: { userId: number }) {
      const url = "/notifications/clear-notifications/" + args.userId;

      type R = Response.Union<null>;
      try {
        const response = await Utils.notifClient.delete<R>(url);

        const { success, message } = response.data;

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

      type R = Response.Union<Schemas.NotificationDTO[]>;
      try {
        const response = await Utils.notifClient.get<R>(url);

        const { success, message } = response.data;

        return success
          ? ResultBuilder.success(response.data.result)
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

    export async function pushNotification(body: Schemas.NewNotification) {
      const parsed = Schemas.newNotification.strip().safeParse(body);

      if (!parsed.success)
        return ResultBuilder.fail(
          Errors.Notification.normalizeError({
            name: "NOTIFICATION_INVALID_SCHEMA_ERROR",
            message: "Arguments do not satisfy the provided schema.",
            err: parsed.error,
          })
        );

      try {
        type R = Response.Union<null>;
        const response = await Utils.notifClient.post<R>(
          "/notifications/send-firebase-notification",
          body
        );

        const { success, message } = response.data;

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
        type R = Response.Union<{ userId: number }>;
        const result = await Utils.notifClient.post<R>(
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

namespace Response {
  export type Success<TResult> = {
    success: true;
    result: TResult;
    message?: string;
  };

  export type Fail = {
    success: false;
    message?: string;
  };

  export type Union<TResult> = Success<TResult> | Fail;
}
