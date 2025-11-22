import z from "zod";
import { Data } from "./data";

export namespace Schemas {
  export const newNotification = z.strictObject({
    userId: z.number(),
    category: z.enum(Data.Notification.categories),
    title: z.string().min(1).max(150),
    message: z.string().min(1).max(2000),
  });

  export type NewNotification = z.infer<typeof newNotification>;
}
