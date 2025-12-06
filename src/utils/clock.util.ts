import "dotenv/config";
import { ENV } from "../data";

export namespace Clock {
  const env = ENV.getEnvironment();
  const isDev = env === "dev";
  const fakeDateISO = process.env.FAKE_DATE as string | undefined;

  if (isDev && !fakeDateISO) throw Error("Fake date is not configured");

  if (isDev)
    console.log(
      "Currently in development. Fake date will be used: " + fakeDateISO
    );

  export const now = () => (isDev ? new Date(fakeDateISO!) : new Date());

  export const nowMs = () =>
    (isDev ? new Date(fakeDateISO!) : new Date()).getTime();
}
