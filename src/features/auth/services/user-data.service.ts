import bcrypt from "bcrypt";
import { createContext } from "../../../db/create-context";
import { DbAccess } from "../../../error";
import type { BaseResult } from "../../../types";
import { ResultBuilder } from "../../../utils";
import { RegisterSchemas, SignInSchema } from "../schemas";
import type { InsertModels, ViewModels } from "../types";
import {
  RoleRepository,
  type StudentFilter,
  StudentRepository,
  UserRepository,
  type IUserFilter,
} from "./repositories";

type NewUser = InsertModels.User;

export async function createUserDataService() {
  const dbContext = await createContext();
  const roleRepoInstance = new RoleRepository(dbContext);
  const studentRepoInstance = new StudentRepository(dbContext);
  const userRepoInstance = new UserRepository(dbContext);
  return new UserDataService(
    roleRepoInstance,
    studentRepoInstance,
    userRepoInstance
  );
}

export class UserDataService {
  private readonly _roleRepository: RoleRepository;
  private readonly _studentRepository: StudentRepository;
  private readonly _userRepository: UserRepository;

  public constructor(
    roleRepository: RoleRepository,
    studentRepository: StudentRepository,
    userRepository: UserRepository
  ) {
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
   * @public
   * @async
   * @function tryAddUser
   * @description Asynchronously inserts a new user into the database through the
   * `UserRepository` with the `insertUser` method.
   * Hashes the `password` field first with `bcrypt` before inserting.
   * @param user - The `NewUser` entry to be inserted.
   * @returns A success object containing the `id` of the `NewUser` inserted, or a `fail` object
   * containing the error class if the insertion failed.
   *
   * !note that the password is not hashed yet when the `NewUser` object is being passed to this method.
   */
  public async tryAddUser(
    user: NewUser
  ): Promise<
    | BaseResult.Success<number, "DB_INSERT">
    | BaseResult.Fail<DbAccess.ErrorClass>
  > {
    const getInsertErr = (err?: unknown) => {
      return DbAccess.normalizeError({
        name: "DB_ACCESS_INSERT_ERROR",
        message:
          "An error occured during database insertion on the `users` table. Please try again later.",
        err,
      });
    };

    user.passwordHash = await bcrypt.hash(user.passwordHash, 10);

    try {
      const insertedId = await this._userRepository.insertUser({ user });

      if (insertedId === undefined) throw getInsertErr();

      return ResultBuilder.success(insertedId, "DB_INSERT");
    } catch (err) {
      const error =
        err instanceof DbAccess.ErrorClass ? err : getInsertErr(err);
      return ResultBuilder.fail(error);
    }
  }

  public async insertUser(
    insertArgs: InsertArgs
  ): Promise<
    | BaseResult.Success<number | undefined, "STUDENTS" | "USERS">
    | BaseResult.Fail<DbAccess.ErrorClass>
  > {
    const getInsertResult = (
      table: "STUDENTS" | "USERS",
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
          const userId = await this._userRepository.insertUser({
            dbOrTx: tx,
            user: insertArgs.user,
          }); //  * insert into users table.

          //  * additionally insert into other tables as needed.
          switch (insertArgs.type) {
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
   * provided by either a {@link NewUser}, a {@link LoginOptions} object.
   * @param options.user A {@link NewUser} object used for filtering the database query
   * during register operations.
   * @param options.signInMethod A `string` specifying whether the user is logging in through email or
   * username. Matches the `keys` of the {@link IUserFilter} type.
   * @param options.authDetails A {@link SignInSchema} object used for filtering the database query
   * during login operations.
   * @returns A `promise` resolving to a success result object containing {@link UserViewModel} if a `User`
   * is found, or `undefined` if no `User` is found. If the query operation fails, returns a fail result
   * object containing a message as well as the stack trace.
   */
  public async tryGetUser(
    options: TryGetUserOptions
  ): Promise<
    | BaseResult.Success<ViewModels.User | undefined>
    | BaseResult.Fail<DbAccess.ErrorClass>
  > {
    let userFilter: IUserFilter = {};

    try {
      switch (options.type) {
        case "user": {
          const { email, username } = options.user;

          userFilter = {
            filterType: "or",
            email,
            username,
          };
          break;
        }
        case "login": {
          const { signInMethod, authDetails } = options;
          userFilter[signInMethod] = authDetails.identifier;
          break;
        }
        case "userId": {
          userFilter.userId = options.userId;
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

  // public async ensureNoDuplicates(
  //   args: Students
  // ): Promise<
  //   | BaseResult.Success<ViewModels.Student | undefined>
  //   | BaseResult.Fail<DbAccess.ErrorClass>
  // >;
  // public async ensureNoDuplicates(
  //   args: Users
  // ): Promise<
  //   | BaseResult.Success<ViewModels.User | undefined>
  //   | BaseResult.Fail<DbAccess.ErrorClass>
  // >;
  /**
   * Returns true if there are no duplicates and false otherwise.
   * @param args
   * @returns
   */
  public async ensureNoDuplicates(args: CheckDuplicateArgs): Promise<
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

  private async __insertStudent(
    newUser: InsertModels.User,
    newStudent: InsertModels.Student
  ): Promise<number | undefined> {
    return await this._userRepository.execTransaction(async (tx) => {
      const userId = await this._userRepository.insertUser({
        dbOrTx: tx,
        user: newUser,
      });

      const studentId = await this._studentRepository.insertStudent({
        dbOrTx: tx,
        student: { id: userId, ...newStudent },
      });

      return studentId;
    });
  }
}
type TryGetUserOptions = WithUser | WithLogin | WithId;

type WithUser = {
  type: "user";
  user: NewUser;
};

type WithLogin = {
  type: "login";
  signInMethod: "email" | "username";
  authDetails: SignInSchema;
};

type WithId = {
  type: "userId";
  userId: number;
};

type InsertArgs =
  | { type: "student"; user: InsertModels.User; student: InsertModels.Student }
  | { type: "user"; user: InsertModels.User }
  | { type: "professor"; user: InsertModels.User };

type QueryArgs =
  | { type: "student"; userFilter: IUserFilter; studentFilter: StudentFilter }
  | { type: "user"; userFilter: IUserFilter }
  | { type: "professor"; userFilter: IUserFilter };

type CheckDuplicateArgs =
  | { type: "student"; schema: RegisterSchemas.Student }
  | { type: "user"; schema: RegisterSchemas.User }
  | { type: "professor"; schema: RegisterSchemas.Student };
