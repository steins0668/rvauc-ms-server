import { promises as fs } from "fs";
import path from "path";

export namespace Json {
  export async function write<T>(args: {
    path?: string;
    fileName: string;
    data: T;
  }) {
    const folderPath = args.path ?? "src/test/artifacts/";

    await fs.mkdir(folderPath, { recursive: true });

    const fullPath = path.join(folderPath, args.fileName);

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
