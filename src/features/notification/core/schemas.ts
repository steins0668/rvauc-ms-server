import z from "zod";

export namespace Schemas {
  export const pushNotification = z.strictObject({
    userId: z.number(),
    category: z.string(),
    title: z.string(),
    message: z.string(),
  });

  export type PushNotification = z.infer<typeof pushNotification>;
}
