import { BaseResult } from "../../../../types";
import { ResultBuilder } from "../../../../utils";
import { Data } from "../data";
import { Errors } from "../errors";

export namespace Config {
  export function getRefreshConfig():
    | BaseResult.Success<Data.Token.CookieConfig>
    | BaseResult.Fail<Errors.Config.ErrorClass> {
    const { cookieConfig: refreshCookie } = Data.Token.configuration.refresh;

    if (!refreshCookie)
      //  cookie config not set
      return ResultBuilder.fail({
        name: "AUTH_CONFIG_COOKIE_CONFIG_ERROR",
        message: "Refresh token cookie is not configured properly.",
      });

    return ResultBuilder.success(refreshCookie);
  }
}
