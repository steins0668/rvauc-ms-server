export namespace Data {
  export namespace Env {
    export function getNotificationSystemAddress() {
      const dev: string | undefined =
        process.env.NOTIFICATION_SYSTEM_ADDRESS_DEV;
      const prod: string | undefined =
        process.env.NOTIFICATION_SYSTEM_ADDRESS_PROD;
      const testing: string | undefined =
        process.env.NOTIFICATION_SYSTEM_ADDRESS_TESTING;

      if (!dev)
        throw new Error("NOTIFICATION_SYSTEM_ADDRESS_DEV not configured.");
      if (!prod)
        throw new Error("NOTIFICATION_SYSTEM_ADDRESS_PROD not configured.");
      if (!testing)
        throw new Error("NOTIFICATION_SYSTEM_ADDRESS_TESTING not configured.");

      return { dev, prod, testing };
    }

    export function getTokenSecret() {
      const tokenSecret: string | undefined =
        process.env.NOTIFICATION_SYSTEM_SECRET;

      if (!tokenSecret)
        throw new Error("NOTIFICATION_SYSTEM_SECRET not configured.");

      return tokenSecret;
    }
  }

  export namespace Notification {
    export const categories = [
      "account_created",
      "password_code_sent",
      "password_code_verified",
      "password_change_success",
      "sign_in_success",
      "sign_out_success",
      "uniform_compliant",
      "uniform_non_compliant",
      "verification_code_sent",
      "verification_code_verified",
      "violation_minor",
      "violation_major",
    ] as const;

    export type Categories = (typeof categories)[number];
  }
}
