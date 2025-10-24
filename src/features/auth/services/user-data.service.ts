import bcrypt from "bcrypt";
import { createContext } from "../../../db/create-context";
import { DbAccess } from "../../../error";
import type { BaseResult } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { RegisterSchemas, SignInSchema } from "../schemas";
import type { InsertModels, ViewModels } from "../types";
import {
  ProfessorRepository,
  RoleRepository,
  StudentRepository,
  UserRepository,
  type IUserFilter,
} from "./repositories";

export async function createUserDataService() {
  const dbContext = await createContext();
  const professorRepoInstance = new ProfessorRepository(dbContext);
  const roleRepoInstance = new RoleRepository(dbContext);
  const studentRepoInstance = new StudentRepository(dbContext);
  const userRepoInstance = new UserRepository(dbContext);
  return new UserDataService(
    professorRepoInstance,
    roleRepoInstance,
    studentRepoInstance,
    userRepoInstance
  );
}

export class UserDataService {
  private readonly _professorRepository: ProfessorRepository;
  private readonly _roleRepository: RoleRepository;
  private readonly _studentRepository: StudentRepository;
  private readonly _userRepository: UserRepository;

  public constructor(
    professorRepository: ProfessorRepository,
    roleRepository: RoleRepository,
    studentRepository: StudentRepository,
    userRepository: UserRepository
  ) {
    this._professorRepository = professorRepository;
    this._roleRepository = roleRepository;
    this._studentRepository = studentRepository;
    this._userRepository = userRepository;
  }

  public async getUserRole(id: number): Promise<string | undefined> {
    const role = await this._roleRepository.getRole({
      searchBy: "id",
      id,
    });

    return role?.name;
  }

  /**
   * Inserts a user into the database and, depending on the type, also into
   * related tables (e.g. `students`).
   *
   * @param {InsertArgs} insertArgs - Contains the entity type and data models to insert.
   * @returns {Promise<
   *   | BaseResult.Success<number | undefined, "STUDENTS" | "USERS">
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
    insertArgs: InsertArgs
  ): Promise<
    | BaseResult.Success<
        number | undefined,
        "PROFESSORS" | "STUDENTS" | "USERS"
      >
    | BaseResult.Fail<DbAccess.ErrorClass>
  > {
    const getInsertResult = (
      table: "PROFESSORS" | "STUDENTS" | "USERS",
      insertedId: number | undefined
    ) => {
      return insertedId !== undefined
        ? ResultBuilder.success(insertedId, table)
        : ResultBuilder.fail<DbAccess.ErrorClass>({
            name: "DB_ACCESS_INSERT_ERROR",
            message: `Failed inserting into '${table.toLowerCase()}' table.`,
          });
    };

    try {
      //  * initiate insertion
      const insertResult = await this._userRepository.execTransaction(
        async (tx) => {
          const { type, user } = insertArgs;

          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
          const userId = await this._userRepository.insertUser({
            dbOrTx: tx,
            user,
          }); //  * insert into users table.

          //  * additionally insert into other tables as needed.
          switch (type) {
            case "professor":
              await this._professorRepository.insertProfessor({
                dbOrTx: tx,
                professor: { ...insertArgs.professor, id: userId },
              });
              return getInsertResult("PROFESSORS", userId);
            case "student":
              await this._studentRepository.insertStudent({
                dbOrTx: tx,
                student: { ...insertArgs.student, id: userId },
              });
              return getInsertResult("STUDENTS", userId);
            case "user":
              return getInsertResult("USERS", userId);
            default: {
              throw new TypeError(
                "Invalid type. Field `type` only accepts values `student` or `user`."
              );
            }
          }
        }
      );

      return insertResult;
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
   * @public
   * @async
   * @function tryGetUser
   * @description Asynchronously attempts to retrieve a `User` from the database filtered using fields
   * provided by either an insert model of the `users` table, or a {@link LoginOptions} object.
   * @param args.user An object used for filtering the database query during register operations.
   * @param args.signInMethod A `string` specifying whether the user is logging in through email or
   * username. Matches the `keys` of the {@link IUserFilter} type.
   * @param args.authDetails A {@link SignInSchema} object used for filtering the database query
   * during login operations.
   * @returns A `promise` resolving to a success result object containing {@link UserViewModel} if a `User`
   * is found, or `undefined` if no `User` is found. If the query operation fails, returns a fail result
   * object containing a message as well as the stack trace.
   */
  public async tryGetUser(
    args: TryGetUserArgs
  ): Promise<
    | BaseResult.Success<ViewModels.User | undefined>
    | BaseResult.Fail<DbAccess.ErrorClass>
  > {
    let userFilter: IUserFilter = {};

    try {
      switch (args.type) {
        case "user": {
          const { email, username } = args.user;

          userFilter = {
            filterType: "or",
            email,
            username,
          };
          break;
        }
        case "login": {
          const { signInMethod, authDetails } = args;
          userFilter[signInMethod] = authDetails.identifier;
          break;
        }
        case "userId": {
          userFilter.userId = args.userId;
          break;
        }
      }

      const user = await this._userRepository.getUser(userFilter);

      return ResultBuilder.success(user);
    } catch (err) {
      return ResultBuilder.fail(
        new DbAccess.ErrorClass({
          name: "DB_ACCESS_QUERY_ERROR",
          message: "Error querying the database. Please try again later.",
          cause: err,
        })
      );
    }
  }

  /**
   * Returns true if there are no duplicates and false otherwise.
   * @param args
   * @returns
   */
  public async ensureNoDuplicates(args: RegisterSchemas.Types): Promise<
    | BaseResult.Success<{
        hasDuplicate: boolean;
        from?: "students" | "users" | undefined;
      }>
    | BaseResult.Fail<DbAccess.ErrorClass>
  > {
    const getResult = (hasDuplicate: boolean, from?: "students" | "users") =>
      ResultBuilder.success({ hasDuplicate, from });

    try {
      //  * check in users table
      const user = await this._userRepository.getUser({
        filterType: "or",
        email: args.schema.email,
        username: args.schema.username,
      });

      if (user) return getResult(true, "users"); //  ! duplicate in users table.

      //  * additional checks in extended tables as needed.
      switch (args.type) {
        case "student": {
          const student = await this._studentRepository.getStudent({
            filterType: "or",
            studentNumber: args.schema.studentNumber,
          });
          if (student) return getResult(true, "students"); //  ! duplicate in students table
        }
      }

      return getResult(false); //  * no duplicates
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
}
type TryGetUserArgs =
  | {
      type: "user";
      user: InsertModels.User;
    }
  | {
      type: "login";
      signInMethod: "email" | "username";
      authDetails: SignInSchema;
    }
  | {
      type: "userId";
      userId: number;
    };

type InsertArgs =
  | { type: "student"; user: InsertModels.User; student: InsertModels.Student }
  | { type: "user"; user: InsertModels.User }
  | {
      type: "professor";
      user: InsertModels.User;
      professor: InsertModels.Professor;
    };
