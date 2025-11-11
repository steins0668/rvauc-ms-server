import { CookieOptions } from "express";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { Types } from "../types";
import { Errors } from "./errors";

export namespace Data {
  export namespace Records {
    export type Role = keyof typeof roles;

    export const roles = {
      student: {
        id: 0,
        name: "student",
      },
      professor: {
        id: 1,
        name: "professor",
      },
    } as const;
  }

  export namespace Regex {
    export const Auth = {
      //  * follows default zod regex
      /**
       * @constant EMAIL
       * @description Validates an email address using Zod's default regex rules:
       * - Must not start with a dot (`.`).
       * - Must not contain consecutive dots (`..`).
       * - Local part may contain letters, digits, underscores, plus signs, hyphens, and dots,
       *   but cannot end with a dot.
       * - Must include an `@` followed by a valid domain.
       * - Domain must start with a letter/digit, may include hyphens, and must end with a valid TLD
       *   of at least 2 characters.
       * - Case-insensitive.
       */
      Email:
        /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i,

      /**
       * @constant USERNAME
       * @description Validates a username with the following rules:
       * - Must start with a letter (A–Z, a–z).
       * - May contain letters, digits, hyphens (`-`), or underscores (`_`).
       * - Length must be between 4 and 24 characters.
       */
      Username: /^[a-zA-Z][a-zA-Z0-9-_]{3,23}$/,

      /**
       * @constant PASSWORD
       * @description Validates a password with the following rules:
       * - Must contain at least one lowercase letter (`a–z`).
       * - Must contain at least one uppercase letter (`A–Z`).
       * - Must contain at least one digit (`0–9`).
       * - Must contain at least one special character from: `! @ # $ %`.
       * - Total length must be between 8 and 24 characters.
       */
      Password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/,

      /**
       * @constant STUDENT_NUMBER
       * @description
       * isValidShortNumber("123-4567"); // true
       * isValidShortNumber("12-3456");  // false
       *
       */
      StudentNumber: /^\d{3}-\d{4}$/,

      UserId: /^\d+$/,

      RfidUid: /^[0-9A-Fa-f]{8,14}$/,
    } as const;
  }

  export namespace Env {
    type MailTrapTransport = {
      user: string;
      password: string;
      host: string;
      port: number;
    };

    export function getMailTrap() {
      const config = {
        user: process.env.MAILTRAP_USER,
        password: process.env.MAILTRAP_PASSWORD,
        host: process.env.MAILTRAP_HOST,
        port: process.env.MAILTRAP_PORT,
      };

      const entries = Object.entries(config);
      entries.forEach(([key, value]) => {
        if (value === undefined) throw new Error(`${key} not configured.`);
      });

      return { ...config, port: Number(config.port) } as MailTrapTransport;
    }

    export function getTknSecrets(): {
      accessSecret: string;
      refreshSecret: string;
    } {
      const accessSecret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
      const refreshSecret: string | undefined =
        process.env.REFRESH_TOKEN_SECRET;
      if (!accessSecret)
        throw new Errors.Config.ErrorClass({
          name: "AUTH_CONFIG_ENV_TKN_SECRET_ERROR",
          message: "ACCESS_TOKEN_SECRET not configured.",
        });
      if (!refreshSecret)
        throw new Errors.Config.ErrorClass({
          name: "AUTH_CONFIG_ENV_TKN_SECRET_ERROR",
          message: "REFRESH_TOKEN_SECRET not configured.",
        });

      return { accessSecret, refreshSecret };
    }
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
        secret: Env.getTknSecrets().accessSecret,
        signOptions: {
          expiresIn: "5m",
        } as jwt.SignOptions,
      },
      refresh: {
        secret: Env.getTknSecrets().refreshSecret,
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
