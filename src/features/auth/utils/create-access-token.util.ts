import { ENUMS } from "../data";
import { Payloads } from "../schemas";
import { UserDataService } from "../services";
import { ViewModels } from "../types";

type Roles = keyof typeof ENUMS.ROLES;

export async function createAccessToken(args: {
  userDataService: UserDataService;
  verifiedUser: ViewModels.User;
  role: Roles;
}) {
  const { userDataService, verifiedUser, role } = args;

  try {
    let payload: Payloads.AccessToken.Professor | Payloads.AccessToken.Student;
    switch (role) {
      case "professor": {
        payload = {
          userInfo: {
            ...verifiedUser,
            role,
          },
        };
      }
      case "student": {
      }
    }
  } catch (err) {}
}
