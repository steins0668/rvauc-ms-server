import "dotenv/config";

export namespace Data {
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
}
