import { Schema } from "../../../models";

export namespace Tables {
  export type PasswordResetCode = typeof Schema.passwordResetCodes;
  export type Professors = typeof Schema.professors;
  export type Roles = typeof Schema.roles;
  export type SessionTokens = typeof Schema.sessionTokens;
  export type SignInRequest = typeof Schema.signInRequests;
  export type Student = typeof Schema.students;
  export type UserSessions = typeof Schema.userSessions;
  export type Users = typeof Schema.users;
}
