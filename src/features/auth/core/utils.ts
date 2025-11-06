import nodemailer from "nodemailer";
import { BaseResult } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { Data } from "./data";
import { Errors } from "./errors";

export namespace Utils {
  export namespace EmailTransports {
    const mailTrapConfig = Data.Env.getMailTrap();

    const transporter = nodemailer.createTransport({
      host: mailTrapConfig.host,
      port: mailTrapConfig.port,
      auth: {
        user: mailTrapConfig.user,
        pass: mailTrapConfig.password,
      },
    });

    export async function sendEmail(args: {
      to: string;
      subject: string;
      text: string;
    }) {
      return await transporter.sendMail({
        from: "RVAUC-MS support<rvauc_ms_support@gmail.com",
        ...args,
      });
    }
  }

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
}
