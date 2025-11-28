import "dotenv/config";
import { ENV } from "../../data";

export namespace Data {
  export namespace Env {
    export function getRedisUrl() {
      const environment = ENV.getEnvironment();

      const envKey = "REDIS_URL_" + environment.toUpperCase();

      const redisUrl: string | undefined = process.env[envKey];

      if (!redisUrl) throw new Error(envKey + " is not configured.");

      return redisUrl;
    }

    export function getRvaucMsAddress() {
      const dev: string | undefined = process.env.RVAUCMS_ADDRESS_DEV;
      const prod: string | undefined = process.env.RVAUCMS_ADDRESS_PROD;
      const testing: string | undefined = process.env.RVAUCMS_ADDRESS_TESTING;

      if (!dev) throw new Error("RVAUCMS_ADDRESS_DEV not configured.");
      if (!prod) throw new Error("RVAUCMS_ADDRESS_PROD not configured.");
      if (!testing) throw new Error("RVAUCMS_ADDRESS_TESTING not configured.");

      return { dev, prod, testing };
    }

    export function getRvaucMsSecret() {
      const tokenSecret: string | undefined = process.env.RVAUCMS_SECRET;

      if (!tokenSecret) throw new Error("STATION_SECRET not configured.");

      return tokenSecret;
    }

    export function getStationSecret() {
      const tokenSecret: string | undefined = process.env.STATION_SECRET;

      if (!tokenSecret) throw new Error("STATION_SECRET not configured.");

      return tokenSecret;
    }
  }
}
