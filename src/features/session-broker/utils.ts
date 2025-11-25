import axios from "axios";
import jwt from "jsonwebtoken";
import { ENV } from "../../data";
import { Data } from "./data";

export namespace Utils {
  const env = ENV.getEnvironment();

  export const serverClient = axios.create({
    baseURL: Data.Env.getRvaucMsAddress()[env],
    withCredentials: true,
  });

  serverClient.interceptors.request.use(
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
      const secret = Data.Env.getRvaucMsSecret();
      const token: string = jwt.sign({ stationName: "station1" }, secret, {
        expiresIn: "1m",
      });

      return token;
    }
  }
}
