import bcrypt from "bcrypt";
import { createContext, DbOrTx } from "../../../db/create-context";
import { SampleData } from "./sample-data";
import { Schema } from "../../../models";

export namespace Seeders {
  export const seedRoles = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    return await context
      .insert(Schema.roles)
      .values(SampleData.roles)
      .onConflictDoNothing()
      .returning();
  };

  export const seedProfessors = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    const hashedUsersProfessors = await Promise.all(
      SampleData.usersProfessors.map(async (value) => {
        value.passwordHash = await bcrypt.hash(value.passwordHash, 10);
        return value;
      }),
    );

    await context
      .insert(Schema.users)
      .values(hashedUsersProfessors)
      .onConflictDoNothing()
      .returning();

    await context
      .insert(Schema.professors)
      .values(SampleData.professors)
      .onConflictDoNothing()
      .returning();
  };

  export const seedStudents = async (dbOrTx?: DbOrTx | undefined) => {
    const context = dbOrTx ?? (await createContext());

    const hashedUsersStudents = await Promise.all(
      SampleData.usersStudents.map(async (value) => {
        value.passwordHash = await bcrypt.hash(value.passwordHash, 10);
        return value;
      }),
    );

    await context
      .insert(Schema.users)
      .values(hashedUsersStudents)
      .onConflictDoNothing()
      .returning();

    await context
      .insert(Schema.students)
      .values(SampleData.students)
      .onConflictDoNothing()
      .returning();
  };
}
