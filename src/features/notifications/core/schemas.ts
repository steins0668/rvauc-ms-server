import z from "zod";
import { Data } from "./data";

export namespace Schemas {
  export const newNotification = z.strictObject({
    userId: z.number(),
    category: z.enum(Data.Notification.categories),
    title: z.string().min(1).max(150),
    message: z.string().min(1).max(2000),
  });

  export const notificationDTO = z.object({
    id: z.number(),
    title: z.string(),
    message: z.string(),
    isRead: z.boolean(),
    sentAt: z.iso.datetime(),
  });

  export type NewNotification = z.infer<typeof newNotification>;
  export type NotificationDTO = z.infer<typeof notificationDTO>;
}
