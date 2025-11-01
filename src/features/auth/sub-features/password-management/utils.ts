import nodemailer from "nodemailer";
import { Data } from "./data";

export namespace Utils {
  export namespace EmailTransports {
    const mailTrapConfig = Data.getMailTrap();

    const transporter = nodemailer.createTransport({
      service: mailTrapConfig.host,
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
}
