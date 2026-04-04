import { promises as fs } from "fs";

export namespace Json {
  export async function write<T>(args: {
    path?: string;
    fileName: string;
    data: T;
  }) {
    const path = args.path ?? "src/test/artifacts/";
    const fullPath = path + args.fileName;

    await fs.writeFile(fullPath, JSON.stringify(args.data, null, 2));
  }

  export async function read<T>(args: {
    path?: string;
    fileName: string;
  }): Promise<T> {
    const path = args.path ?? "src/test/artifacts/";
    const fullPath = path + args.fileName;

    const read = await fs.readFile(fullPath, "utf-8");
    return JSON.parse(read);
  }
}
