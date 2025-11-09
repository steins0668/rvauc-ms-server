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
    return new Service(userRepo);
  }

  export class Service {
    private readonly _userRepo: Repositories.User;

    constructor(userRepo: Repositories.User) {
      this._userRepo = userRepo;
    }

    public async authenticate(
      args: AuthenticationArgs
    ): Promise<
      | Types.AuthenticationResult.Success<Schemas.UserData.AuthenticationDTO>
      | Types.AuthenticationResult.Fail
    > {
      const field = this.getIdentifierField(args.identifier);

      if (field === null)
        return ResultBuilder.fail({
          name: "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR",
          message: "Incorrect sign-in credentials. Please try again.",
        });

      const userQuery = await this.findUserWhere({
        filter: { [field]: args.identifier },
      });

      if (!userQuery.success)
        return ResultBuilder.fail({
          name: "AUTHENTICATION_SYSTEM_ERROR",
          message:
            "An error occured while authenticating. Please try again later.",
        });

      const { result: userRecord } = userQuery;

      const invalidCredentialsResult =
        ResultBuilder.fail<Errors.Authentication.ErrorClass>({
          name: "AUTHENTICATION_SIGN_IN_VERIFICATION_ERROR",
          message: "Incorrect sign-in credentials. Please try again.",
        });

      if (!userRecord) return invalidCredentialsResult;

      const { passwordHash, role, ...profileData } = userRecord;

      if (args.type === "password") {
        const { password } = args;
        const isAuthenticated = await bcrypt.compare(password, passwordHash);

        if (!isAuthenticated) return invalidCredentialsResult;
      }

      return ResultBuilder.success({ ...profileData, role: role.name });
    }

    private getIdentifierField(identifier: string) {
      const isEmail = Data.Regex.Auth.Email.test(identifier);
      const isUsername = Data.Regex.Auth.Username.test(identifier);

      return isEmail ? "email" : isUsername ? "username" : null;
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
              columns: { roleId: false },
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
      const signInMethod = this.getIdentifierField(identifier);

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
