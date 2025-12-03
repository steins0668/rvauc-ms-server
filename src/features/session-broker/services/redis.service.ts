import { createClient, type RedisClientType } from "redis";
import { Data } from "../data";

export namespace RedisService {
  let client: RedisClientType | undefined;
  let connecting: Promise<RedisClientType> | null = null;

  export async function getClient() {
    if (!client) client = createClient({ url: Data.Env.getRedisUrl() });

    if (client.isOpen) return client;

    if (!connecting) {
      connecting = client.connect();
      connecting?.finally(() => (connecting = null));
    }

    await connecting;
    return client;
  }

  export async function get(key: string) {
    const client = await getClient();

    return await client.get(key);
  }

  export async function set(key: string, value: string, expirySeconds: number) {
    const client = await getClient();

    await client.set(key, value, {
      expiration: { type: "EX", value: expirySeconds },
    });
  }

  export async function del(key: string) {
    const client = await getClient();

    return await client.del(key);
  }

  type Record = { [key: string]: any };
  export async function hSet(key: string, value: Record) {
    const client = await getClient();

    await client.hSet(key, value);
  }

  export async function quitClient() {
    if (client) await client.quit();
  }
}
