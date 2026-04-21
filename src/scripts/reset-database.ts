import { createContext, TxContext } from "../db/create-context";

export const resetDatabase = async (tx?: TxContext | undefined) => {
  const context = tx ?? (await createContext());
  await context.run(`PRAGMA foreign_keys = OFF;`);

  const tables = await context.all(
    `SELECT name FROM sqlite_master WHERE type='table';`,
  );

  console.log(JSON.stringify(tables));

  for (const t of tables) {
    const { name } = t as any;

    if (name !== "sqlite_sequence" && name !== "__drizzle_migrations")
      await context.run(`DELETE FROM ${name};`);
  }

  await context.run(`DELETE FROM sqlite_sequence;`);
  await context.run(`PRAGMA foreign_keys = ON`);
};
