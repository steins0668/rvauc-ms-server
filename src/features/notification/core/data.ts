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
}
