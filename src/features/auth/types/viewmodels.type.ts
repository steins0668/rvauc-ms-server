import { Schema } from "../../../models";

export namespace ViewModels {
  export type PasswordResetCode = typeof Schema.passwordResetCodes.$inferSelect;
  export type Professor = typeof Schema.professors.$inferSelect;
  export type Role = typeof Schema.roles.$inferSelect;
  export type SessionToken = typeof Schema.sessionTokens.$inferSelect;
  export type SignInRequest = typeof Schema.signInRequests.$inferSelect;
  export type Student = typeof Schema.students.$inferSelect;
  export type UserSession = typeof Schema.userSessions.$inferSelect;
  export type User = typeof Schema.users.$inferSelect;
}
