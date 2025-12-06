import { ENV } from "../../../../data";
import { EmailTransports } from "./email-transports.util";

export namespace Mailer {
  export async function send(args: {
    to: string;
    subject: string;
    text: string;
  }) {
    const env = ENV.getEnvironment();

    const { to, subject, text } = args;
    if (env === "dev")
      console.log(
        JSON.stringify({
          to,
          subject,
          text,
        })
      );

    if (env === "testing") {
      return await EmailTransports.sendEmail({
        to,
        subject,
        text,
      });
    }

    if (env === "prod") throw Error("Production behavior not developed yet.");

    console.log(text);
  }
}
