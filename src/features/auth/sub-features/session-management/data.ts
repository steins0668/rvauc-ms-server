import { CookieOptions } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { CustomError } from "./error";
import { Types } from "./types";

export namespace Data {
  export function getTknSecrets(): {
    accessSecret: string;
    refreshSecret: string;
  } {
    const accessSecret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
    const refreshSecret: string | undefined = process.env.REFRESH_TOKEN_SECRET;
    if (!accessSecret)
      throw new CustomError.Config.ErrorClass({
        name: "AUTH_CONFIG_ENV_TKN_SECRET_ERROR",
        message: "ACCESS_TOKEN_SECRET not configured.",
      });
    if (!refreshSecret)
      throw new CustomError.Config.ErrorClass({
        name: "AUTH_CONFIG_ENV_TKN_SECRET_ERROR",
        message: "REFRESH_TOKEN_SECRET not configured.",
      });

    return { accessSecret, refreshSecret };
  }

  export namespace Token {
    export type CookieConfig = {
      cookieName: string;
      clearCookie: CookieOptions;
      persistentCookie: CookieOptions;
      sessionCookie: CookieOptions;
    };
    type TokenConfig = {
      secret: string;
      signOptions: jwt.SignOptions;
      cookieConfig?: CookieConfig;
    };
    type Configuration = Record<Types.AuthToken, TokenConfig>;

    /**
     * @constant tokenConfigRecord
     * @description A {@link Configuration} object containing config details about different
     * token types. It's key is of type {@link TokenType}.
     */
    export const configuration: Configuration = {
      access: {
        secret: getTknSecrets().accessSecret,
        signOptions: {
          expiresIn: "5m",
        } as jwt.SignOptions,
      },
      refresh: {
        secret: getTknSecrets().refreshSecret,
        signOptions: {
          expiresIn: "30d",
        } as jwt.SignOptions,
        cookieConfig: {
          cookieName: "refresh_token",
          clearCookie: {
            httpOnly: true,
            sameSite: "none",
            secure: false, // *change to true in production/when not using thunderclient
          },
          persistentCookie: {
            httpOnly: true,
            sameSite: "none",
            secure: false,
            maxAge: 24 * 60 * 60 * 1000, // 1 day
          },
          sessionCookie: {
            httpOnly: true,
            sameSite: "none",
            secure: false,
          },
        },
      },
    } as const;
  }
}
