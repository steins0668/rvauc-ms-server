import axios from "axios";
import jwt from "jsonwebtoken";
import { Data } from "./data";
import { ENV } from "../../../data";

export namespace Utils {
  const env = ENV.getEnvironment();

  export const notifClient = axios.create({
    baseURL: Data.Env.getNotificationSystemAddress()[env],
    withCredentials: true,
  });

  notifClient.interceptors.request.use(
    (config) => {
      // means the request not a retry, it's the first attempt.
      if (!config.headers["Authorization"]) {
        //  use a new token to make the request.
        config.headers["Authorization"] = `Bearer ${Jwt.createToken()}`;
      }
      return config;
    },
    (err) => {
      Promise.reject(err);
    }
  );

  export namespace Jwt {
    export function createToken() {
      const secret = Data.Env.getTokenSecret();
      const token: string = jwt.sign({ serviceName: "rvauc-ms" }, secret, {
        expiresIn: "1m",
      });

      return token;
    }
  }
}
