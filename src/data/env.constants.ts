import { Schemas } from "../schemas";

export function getDbUrl(): string {
  const dbName: string | undefined = process.env.DB_URL;
  if (!dbName) throw new Error("DB URL not configured.");

  return dbName;
}

export function getEnvironment(): Schemas.Environment {
  const environment: string | undefined = process.env.ENVIRONMENT;

  const parsed = Schemas.environment.safeParse(environment);

  if (!parsed.success) throw new Error("ENVIRONMENT not configured.");

  return parsed.data;
}

export function getWhiteList(): string[] {
  const whitelist = process.env.WHITELIST;

  const parsed = Schemas.whitelist.safeParse(whitelist?.split(","));

  if (!parsed.success)
    throw new Error("WHITELIST not configured: " + parsed.error);

  return parsed.data;
}
