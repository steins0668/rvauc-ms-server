import bcrypt from "bcrypt";
import {
  createContext,
  DbOrTx,
  execTransaction,
  TxContext,
} from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import type { BaseResult } from "../../../../types";
import { ResultBuilder } from "../../../../utils";
import { Core } from "..";
import { Repositories } from "../../repositories";
import { Types } from "../../types";
import { Registration } from "../../sub-features/registration";

export namespace UserData {
  export async function createService() {
    const dbContext = await createContext();
    const professorRepoInstance = new Repositories.Professor(dbContext);
    const roleRepoInstance = new Repositories.Role(dbContext);
    const studentRepoInstance = new Repositories.Student(dbContext);
    const userRepoInstance = new Repositories.User(dbContext);
    return new Service(
      professorRepoInstance,
      roleRepoInstance,
      studentRepoInstance,
      userRepoInstance
    );
  }

  export class Service {
    private readonly _professorRepository: Repositories.Professor;
    private readonly _roleRepository: Repositories.Role;
    private readonly _studentRepository: Repositories.Student;
    private readonly _userRepository: Repositories.User;

    public constructor(
      professorRepository: Repositories.Professor,
      roleRepository: Repositories.Role,
      studentRepository: Repositories.Student,
      userRepository: Repositories.User
    ) {
      this._professorRepository = professorRepository;
      this._roleRepository = roleRepository;
      this._studentRepository = studentRepository;
      this._userRepository = userRepository;
    }

    public async getUserRole(id: number): Promise<string | undefined> {
      const role = await this._roleRepository.getOne({
        searchBy: "id",
        id,
      });

      return role?.name;
    }

    public async queryProfessors<T>(
      args: Types.Repository.QueryArgs.Professor<T>
    ) {
      try {
        const result = await this._professorRepository.execQuery(args);

        if (result === undefined)
          return ResultBuilder.fail(
            new DbAccess.ErrorClass({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Could not find professor/s.",
            })
          );

        return ResultBuilder.success(result);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Failed querying professors table.",
            err,
          })
        );
      }
    }

    public async findStudentWhere(args: {
      dbOrTx?: DbOrTx;
      filter: Types.Repository.QueryFilters.Student;
    }) {
      return await this.queryStudents({
        dbOrTx: args.dbOrTx,
        fn: async (query, converter) =>
          await query.findFirst({ where: converter(args.filter) }),
      });
    }

    public async queryStudents<T>(args: Types.Repository.QueryArgs.Student<T>) {
      try {
        const result = await this._studentRepository.execQuery(args);

        if (result === undefined || result === null)
          return ResultBuilder.fail(
            new DbAccess.ErrorClass({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Could not find student/s.",
            })
          );

        return ResultBuilder.success(result);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Failed querying students table.",
            err,
          })
        );
      }
    }

    public async queryUsers<T>(args: Types.Repository.QueryArgs.User<T>) {
      try {
        const result = await this._userRepository.execQuery(args);

        if (result === undefined || result === null)
          return ResultBuilder.fail(
            new DbAccess.ErrorClass({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Could not find user/s.",
            })
          );

        return ResultBuilder.success(result);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Failed querying students table.",
            err,
          })
        );
      }
    }

    public async updateUsers<T>(args: Types.Repository.UpdateArgs.User<T>) {
      try {
        const update = await this._userRepository.execUpdate(args);
        return ResultBuilder.success(update);
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_UPDATE_ERROR",
            message: "Could not update user/s.",
            err,
          })
        );
      }
    }
    /**
     * Inserts a user into the database and, depending on the type, also into
     * related tables (e.g. `students`).
     *
     * @param form - Contains the form data.
     * @returns {Promise<
     *   | BaseResult.Success<number | undefined, _Role>
     *   | BaseResult.Fail<DbAccess.ErrorClass>
     * >}
     * Resolves with the inserted user ID and table name on success, or a database
     * error on failure.
     *
     * @description
     * The method runs within a transaction:
     * 1. Inserts into the `users` table.
     * 2. If type is `"student"`, also inserts into the `students` table.
     * 3. Returns a success or failure result depending on the outcome.
     */
    public async insertUser(
      form: Registration.Schemas.Register.RoleBased
    ): Promise<
      | BaseResult.Success<number | undefined, Role>
      | BaseResult.Fail<DbAccess.ErrorClass>
    > {
      const getInsertResult = (
        role: Role | undefined,
        insertedId: number | undefined
      ) => {
        return insertedId !== undefined
          ? ResultBuilder.success(insertedId, role)
          : ResultBuilder.fail<DbAccess.ErrorClass>({
              name: "DB_ACCESS_INSERT_ERROR",
              message: `Failed inserting ${role}.`,
            });
      };

      try {
        return await execTransaction(async (tx) => {
          form.passwordHash = await bcrypt.hash(form.passwordHash, 10);

          const id = await this._userRepository.insertOne({
            dbOrTx: tx,
            user: form,
          });

          if (id === undefined) return getInsertResult(form.role, id);

          const id2 = await this._runInsert({ tx, id, schema: form });

          return getInsertResult(form.role, id2);
        });
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_INSERT_ERROR",
            message: "Error inserting entity to table.",
            err,
          })
        );
      }
    }
    /**
     * Returns true if there are no duplicates and false otherwise.
     * @param form
     * @returns
     */
    public async ensureNoDuplicates(
      form: Registration.Schemas.Register.RoleBased
    ): Promise<
      | BaseResult.Success<{
          hasDuplicate: boolean;
          from?: Role | undefined;
        }>
      | BaseResult.Fail<DbAccess.ErrorClass>
    > {
      const getResult = (hasDuplicate: boolean, from?: Role) =>
        ResultBuilder.success({ hasDuplicate, from });

      try {
        return await execTransaction(async (tx) => {
          //  * check in users table
          const user = await this._userRepository.execQuery({
            dbOrTx: tx,
            fn: async (query, converter) => {
              const { email, username } = form;
              const where = converter({ email, username });
              return query.findFirst({ where, with: { role: true } });
            },
          });

          if (user) return getResult(true, form.role);

          //  * additional checks in extended tables as needed.
          const hasDuplicate = await this._runDuplicateCheck(form.role, form);

          return getResult(hasDuplicate, form.role);
        });
      } catch (err) {
        return ResultBuilder.fail(
          DbAccess.normalizeError({
            name: "DB_ACCESS_QUERY_ERROR",
            message: "Error querying the database. Please try again later.",
            err,
          })
        );
      }
    }
    //#region Utilities
    /**
     * @description A `linker` for the `insertResolvers` and the call site.
     * Used as a workaround for the type limitations when calling ambiguously
     * with a given `roleId` and `schema`.
     */
    private async _runInsert<R extends Role>(args: InsertArgs<R>) {
      return await this._insertResolvers[args.schema.role](args);
    }

    /**
     * @description A collection of resolvers for inserting new data into
     * the `students` and `professors` tables with the following mapping
     */
    private _insertResolvers: InsertResolvers = {
      student: async (args: InsertArgs<"student">) => {
        return await this._studentRepository.insertOne({
          dbOrTx: args.tx,
          student: { ...args.schema, id: args.id },
        });
      },
      professor: async (args: InsertArgs<"professor">) => {
        return await this._professorRepository.insertOne({
          dbOrTx: args.tx,
          professor: { ...args.schema, id: args.id },
        });
      },
    };

    private _runDuplicateCheck<R extends Role>(
      role: R,
      schema: RegisterSchema<R>
    ) {
      return this._duplicateCheckResolvers[role](schema);
    }

    /**
     * @description A collection of resolvers for checking duplicates from the
     * the `students` and `professors` tables with the following mapping
     */
    private _duplicateCheckResolvers: DuplicateCheckResolvers = {
      //  * professors table does not need additional checks
      professor: async (schema: Registration.Schemas.Register.Professor) =>
        false,
      student: async (schema: Registration.Schemas.Register.Student) => {
        const student = await this._studentRepository.execQuery({
          fn: async (query, converter) => {
            return query.findFirst({
              where: converter({
                filterType: "or",
                studentNumber: schema.studentNumber,
              }),
            });
          },
        });

        return !!student; //  ! duplicate in students table.
      },
    };
    //#endregion Utilities
  }

  //#region Types
  type Role = keyof typeof Core.Data.Records.roles;
  type RegisterSchema<R extends Role> = Extract<
    Registration.Schemas.Register.RoleBased,
    { role: R }
  >;
  type DuplicateCheckResolvers = {
    [R in Role]: (schema: RegisterSchema<R>) => Promise<boolean>;
  };

  type InsertArgs<R extends Role> = {
    tx: TxContext;
    schema: RegisterSchema<R>;
    id: number;
  };

  type InsertResolvers = {
    [R in Role]: (args: InsertArgs<R>) => Promise<number | undefined>;
  };
  //#endregion
}
