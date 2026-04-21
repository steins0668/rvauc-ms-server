import "dotenv/config";
import { ENV } from "../data";

export namespace Clock {
  const env = ENV.getEnvironment();
  const isDevOrTesting = env === "dev" || env === "testing";
  const fakeDateISO = process.env.FAKE_DATE as string | undefined;

  if (isDevOrTesting && !fakeDateISO)
    throw Error("Fake date is not configured");

  if (isDevOrTesting)
    console.log(
      "Currently in development. Fake date will be used: " + fakeDateISO,
    );

  export const now = (date?: Date | undefined) =>
    isDevOrTesting ? (date ?? new Date(fakeDateISO!)) : new Date();

  export const nowMs = () =>
    (isDevOrTesting ? new Date(fakeDateISO!) : new Date()).getTime();
}
