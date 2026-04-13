import dotenv from "dotenv";
import * as jwt from "jsonwebtoken";
import promptSync from "prompt-sync";
import { Core } from "../features/auth/core";

const main = async () => {
  dotenv.config();

  const prompt = promptSync({ sigint: true }); // sigint: true allows exit with Ctrl+C

  const payloadTypes = {
    full: { id: 1, name: "full" },
    minimal: { id: 2, name: "minimal" },
    microservice: { id: 3, name: "microservice" },
  } as const;

  let payloadType;

  console.log("--- Token Generator ---");

  while (true) {
    let tokenTypeId;

    try {
      tokenTypeId = parseInt(
        prompt(`
        Pick a payload type:
        1. Full
        2. Minimal
        3. Microservice
    `),
        10,
      );
    } catch (error) {
      console.log("Your input is invalid. Please try again.");
      continue;
    }

    payloadType = Object.values(payloadTypes).find(
      (tt) => tt.id === tokenTypeId,
    );

    if (payloadType === undefined) {
      console.log("Your input is invalid. Please try again.");
      continue;
    }
    break;
  }

  console.log(`You have chosen type: ${payloadType.name}`);

  const generatePayload = async (
    payloadType: (typeof payloadTypes)[keyof typeof payloadTypes]["name"],
  ) => {
    switch (payloadType) {
      case "minimal":
      case "full": {
        const authenticationService =
          await Core.Services.Authentication.createService();

        const dataService = await Core.Services.UserData.createService();

        while (true) {
          let user;

          try {
            const identifier = prompt(
              "Please enter any user identifier (email/username/student number).",
            );
            const auth = await authenticationService.authenticate({
              type: "session",
              identifier,
            });

            if (!auth.success) {
              console.error("Failed authentication: ", auth.error);
              console.log("Please try again.");
              continue;
            }

            user = auth.result;
          } catch (err) {
            console.error("Invalid input. Please try again.");
            continue;
          }

          const createAccessPayload = await Core.Utils.payloadResolver[
            user.role
          ]({
            type: payloadType as any,
            dataService,
            user,
          });

          if (!createAccessPayload.success) {
            console.error(
              "Failed creating payloads: ",
              createAccessPayload.error,
            );
            console.log("Please try again.");
            continue;
          }

          return createAccessPayload.result;
        }
      }
      case "microservice": {
        while (true) {
          try {
            return {
              stationName: prompt("Please enter the station name: "),
            };
            break;
          } catch (err) {
            console.error("Invalid input. Please try again.");
            continue;
          }
        }
      }
    }
  };

  const payload = await generatePayload(payloadType.name);

  const secret = Core.Data.Env.getAccessSecrets()[payloadType.name];
  const signOptions = Core.Data.Token.signOptions[payloadType.name];
  const token: string = jwt.sign(
    payload as any,
    secret,
    signOptions as jwt.SignOptions,
  );

  //   return jwt.sign(jwtOptions.payload, secret, signOptions as jwt.SignOptions);

  console.log(token);
};

main();
