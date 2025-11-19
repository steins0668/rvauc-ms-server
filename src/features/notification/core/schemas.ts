import z from "zod";
import { Data } from "./data";

export namespace Schemas {
  export const pushNotification = z.strictObject({
    userId: z.number(),
    category: z.enum(Data.Notification.categories),
    title: z.string(),
    message: z.string(),
  });

  export type PushNotification = z.infer<typeof pushNotification>;
}
