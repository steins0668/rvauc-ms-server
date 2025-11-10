import bcrypt from "bcrypt";
import { createContext, DbOrTx } from "../../../../db/create-context";
import { DbAccess } from "../../../../error";
import { ResultBuilder } from "../../../../utils";
import { Repositories } from "../../repositories";
import { Types as SharedTypes } from "../../types";
import { Types } from "../types";
import { Data } from "../data";
import { Errors } from "../errors";
import { Schemas } from "../schemas";

type AuthenticationArgs =
  | { type: "password"; identifier: string; password: string }
  | { type: "session"; identifier: string };

export namespace Authentication {
  export async function createService() {
    const context = await createContext();
    const userRepo = new Repositories.User(context);
    const studentRepo = new Repositories.Student(context);
    return new Service(userRepo, studentRepo);
  }

  export class Service {
    private readonly _userRepo: Repositories.User;
    private readonly _studentRepo: Repositories.Student;

    constructor(
      userRepo: Repositories.User,
      studentRepo: Repositories.Student
    ) {
      this._userRepo = userRepo;
      this._studentRepo = studentRepo;
    }

    public async authenticateStudent(studentNumber: string) {
      const invalidCredentialsResult =
        ResultBuilder.fail<Errors.Authentication.ErrorClass>({
          name: "AUTHENTICATION_IDENTITY_VERIFICATION_ERROR",
          message: "Incorrect credentials. Please try again.",
        });

      const field = this.getStudentIdentifierField(studentNumber);

      if (field === null) return invalidCredentialsResult;

      const studentQuery = await this.findStudentUser({
        filter: { studentNumber },
      });

      if (!studentQuery.success)
        return ResultBuilder.fail({
          name: "AUTHENTICATION_SYSTEM_ERROR",
          message:
            "An error occured while authenticating. Please try again later.",
        });

      const userRecord = studentQuery.result?.user;

      if (!userRecord) return invalidCredentialsResult;

      const { passwordHash, role, ...profileData } = userRecord;

      const dtoParse = Schemas.UserData.authenticationDTO
        .strip()
        .safeParse({ ...profileData, role: role.name });

      return dtoParse.success
        ? ResultBuilder.success(dtoParse.data)
        : ResultBuilder.fail(
            Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_SYSTEM_ERROR",
              message: "Dto conversion failed.",
              err: dtoParse.error,
            })
          );
    }

    public async authenticateUser(
      args: AuthenticationArgs
    ): Promise<
      | Types.AuthenticationResult.Success<Schemas.UserData.AuthenticationDTO>
      | Types.AuthenticationResult.Fail
    > {
      const invalidCredentialsResult =
        ResultBuilder.fail<Errors.Authentication.ErrorClass>({
          name: "AUTHENTICATION_IDENTITY_VERIFICATION_ERROR",
          message: "Incorrect credentials. Please try again.",
        });

      const field = this.getUserIdentifierField(args.identifier);

      if (field === null) return invalidCredentialsResult;

      const isPasswordFlow = args.type === "password";
      const isNotEmailOrUsernameField =
        field !== "email" && field !== "username";
      if (isPasswordFlow && isNotEmailOrUsernameField)
        return invalidCredentialsResult; //  ! email or username only for password mode/type.

      const isIdField = field === "id";
      const value = isIdField ? Number(args.identifier) : args.identifier; //  * cast values as needed.

      const userQuery = await this.findUserWhere({
        filter: { [field]: value },
      });

      if (!userQuery.success)
        return ResultBuilder.fail({
          name: "AUTHENTICATION_SYSTEM_ERROR",
          message:
            "An error occured while authenticating. Please try again later.",
        });

      const { result: userRecord } = userQuery;

      if (!userRecord) return invalidCredentialsResult;

      const { passwordHash, role, ...profileData } = userRecord;

      if (args.type === "password") {
        const { password } = args;
        const isAuthenticated = await bcrypt.compare(password, passwordHash);

        if (!isAuthenticated) return invalidCredentialsResult;
      }

      const dtoParse = Schemas.UserData.authenticationDTO
        .strip()
        .safeParse({ ...profileData, role: role.name });

      return dtoParse.success
        ? ResultBuilder.success(dtoParse.data)
        : ResultBuilder.fail(
            Errors.Authentication.normalizeError({
              name: "AUTHENTICATION_SYSTEM_ERROR",
              message: "Dto conversion failed.",
              err: dtoParse.error,
            })
          );
    }

    private getStudentIdentifierField(identifier: string) {
      const isStudentNumber = Data.Regex.Auth.StudentNumber.test(identifier);

      return isStudentNumber ? "studentNumber" : null;
    }

    private getUserIdentifierField(identifier: string) {
      const isEmail = Data.Regex.Auth.Email.test(identifier);
      const isUsername = Data.Regex.Auth.Username.test(identifier);
      const isId = Data.Regex.Auth.UserId.test(identifier);
      const isRfidUid = Data.Regex.Auth.RfidUid.test(identifier);

      return isEmail
        ? "email"
        : isUsername
        ? "username"
        : isId
        ? "id"
        : isRfidUid
        ? "rfidUid"
        : null;
    }

    private async findStudentUser(args: {
      dbOrTx?: DbOrTx;
      filter: SharedTypes.Repository.QueryFilters.Student;
    }) {
      return await this._studentRepo.execQuery({
        fn: async (query, converter) => {
          try {
            const result = await query.findFirst({
              where: converter(args.filter),
              columns: {}, //  * no need for columns. only user
              with: {
                user: {
                  columns: { roleId: false, rfidUid: false },
                  with: { role: true },
                },
              },
            });

            return ResultBuilder.success(result);
          } catch (err) {
            return ResultBuilder.fail(
              DbAccess.normalizeError({
                name: "DB_ACCESS_QUERY_ERROR",
                message: "Failed querying users.",
                err,
              })
            );
          }
        },
      });
    }

    private async findUserWhere(args: {
      dbOrTx?: DbOrTx;
      filter: SharedTypes.Repository.QueryFilters.User;
    }) {
      return await this._userRepo.execQuery({
        fn: async (query, converter) => {
          try {
            const result = await query.findFirst({
              where: converter(args.filter),
              columns: { roleId: false, rfidUid: false },
              with: { role: true },
            });

            return ResultBuilder.success(result);
          } catch (err) {
            return ResultBuilder.fail(
              DbAccess.normalizeError({
                name: "DB_ACCESS_QUERY_ERROR",
                message: "Failed querying users.",
                err,
              })
            );
          }
        },
      });
    }

    private getSafeId(identifier: string): string {
      const signInMethod = this.getUserIdentifierField(identifier);

      switch (signInMethod) {
        case "email":
          return identifier.replace(/^(.{2}).*(@.*)$/, "$1***$2"); //  mask emails
        case "username":
          return identifier.slice(0, Math.min(8, identifier.length)) + "***";
        default:
          return JSON.stringify(identifier).slice(0, 50);
      }
    }
  }
}
