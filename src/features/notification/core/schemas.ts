import z from "zod";

export namespace Schemas {
  export const pushNotification = z.strictObject({
    userId: z.number(),
    category: z.string(), //  todo: add better validation
    title: z.string(), //  todo: add better validation
    message: z.string(), //  todo: add better validation
  });

  export type PushNotification = z.infer<typeof pushNotification>;
}
