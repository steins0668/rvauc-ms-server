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
    const authentication = [
      "account_created",
      "password_code_not_verified",
      "password_code_sent",
      "password_code_still_active",
      "password_code_verified",
      "password_change_success",
      "sign_in_success",
      "sign_out_success",
      "verification_code_sent",
      "verification_code_verified",
      "verification_failed",
    ] as const;

    const uniformCompliance = [
      "uniform_compliant",
      "uniform_non_compliant",
    ] as const;

    const violation = ["violation_minor", "violation_major"] as const;

    const internalCategories = ["internal_error"] as const;

    export const categories = [
      ...authentication,
      ...uniformCompliance,
      ...violation,
      ...internalCategories,
    ] as const;

    export type Categories = (typeof categories)[number];
  }
}
