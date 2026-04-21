import bcrypt from "bcrypt";
import { createContext, DbOrTx } from "../../../db/create-context";
import { Auth } from "../../../features/auth";
import { SampleData } from "./sample-data";

export namespace Seeders {
  export const seedRoles = async (dbOrTx?: DbOrTx | undefined) => {
    const roleRepo = new Auth.Repositories.Role(await createContext());

    return await roleRepo.execInsert({
      dbOrTx,
      fn: async (insert) =>
        insert.values(SampleData.roles).onConflictDoNothing().returning(),
    });
  };

  export const seedProfessors = async (dbOrTx?: DbOrTx | undefined) => {
    const userRepo = new Auth.Repositories.User(await createContext());
    const profRepo = new Auth.Repositories.Professor(await createContext());

    const hashedUsersProfessors = await Promise.all(
      SampleData.usersProfessors.map(async (value) => {
        value.passwordHash = await bcrypt.hash(value.passwordHash, 10);
        return value;
      }),
    );

    await userRepo.execInsert({
      dbOrTx,
      fn: async (insert) =>
        insert.values(hashedUsersProfessors).onConflictDoNothing().returning(),
    });

    await profRepo.execInsert({
      dbOrTx,
      fn: async (insert) =>
        insert.values(SampleData.professors).onConflictDoNothing().returning(),
    });
  };

  export const seedStudents = async (dbOrTx?: DbOrTx | undefined) => {
    const userRepo = new Auth.Repositories.User(await createContext());
    const studentRepo = new Auth.Repositories.Student(await createContext());

    const hashedUsersStudents = await Promise.all(
      SampleData.usersStudents.map(async (value) => {
        value.passwordHash = await bcrypt.hash(value.passwordHash, 10);
        return value;
      }),
    );

    await userRepo.execInsert({
      dbOrTx,
      fn: async (insert) =>
        insert.values(hashedUsersStudents).onConflictDoNothing().returning(),
    });

    await studentRepo.execInsert({
      dbOrTx,
      fn: async (insert) =>
        insert.values(SampleData.students).onConflictDoNothing().returning(),
    });
  };
}
