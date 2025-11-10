import { Schemas } from "../schemas";

type AnySchemaName = Schemas.Payloads.AccessToken.AnySchema extends infer S
  ? S extends { type: infer T; schema: infer _ }
    ? T
    : never
  : never;

export function ensureAllowedPayload<T extends AnySchemaName>(
  payload: Schemas.Payloads.AccessToken.AnyPayload,
  ...allowedSchemas: T[]
): payload is Extract<Schemas.Payloads.AccessToken.AnyPayload, { type: T }> {
  return allowedSchemas.includes(payload.type as T);
}
