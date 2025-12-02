import z from "zod";

export namespace Schemas {
  export const environment = z.enum(["dev", "prod", "testing"]);

  export type Environment = z.infer<typeof environment>;

  export const whitelist = z.array(z.string());
}
