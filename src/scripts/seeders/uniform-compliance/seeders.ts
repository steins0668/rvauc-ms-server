import { createContext, DbOrTx } from "../../../db/create-context";
import { UniformCompliance } from "../../../features/uniform-compliance";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedUniformTypes = async (dbOrTx?: DbOrTx | undefined) => {
    const uniformTypeRepo = new UniformCompliance.Repositories.UniformType(
      await createContext(),
    );

    return await uniformTypeRepo.execInsert({
      dbOrTx,
      fn: async (insert) => insert.values(SampleData.uniformTypes),
    });
  };
}
