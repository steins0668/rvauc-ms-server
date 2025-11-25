import { ResultBuilder } from "../../../utils";
import { Errors } from "../errors";
import { RedisService } from "./redis.service";

export namespace SessionBroker {
  export async function storeToken(
    stationIdentifier: string,
    accessToken: string
  ) {
    try {
      const expirySeconds = 180;
      await RedisService.set(stationIdentifier, accessToken, expirySeconds);
      return ResultBuilder.success(null);
    } catch (err) {
      return ResultBuilder.fail(
        Errors.Session.normalizeError({
          name: "SESSION_STORE_TOKEN_ERROR",
          message: "Failed storing token.",
          err,
        })
      );
    }
  }

  export async function getToken(stationIdentifier: string) {
    try {
      return ResultBuilder.success(await RedisService.get(stationIdentifier));
    } catch (err) {
      return ResultBuilder.fail(
        Errors.Session.normalizeError({
          name: "SESSION_RETRIEVE_TOKEN_ERROR",
          message: "Failed retrieving active token for station.",
          err,
        })
      );
    }
  }
}
