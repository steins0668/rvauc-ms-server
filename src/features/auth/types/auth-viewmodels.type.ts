import { Schema } from "../../../models";

export type PasswordResetToken = typeof Schema.passwordResetTokens.$inferSelect;
export type Professor = typeof Schema.professors.$inferSelect;
export type Role = typeof Schema.roles.$inferSelect;
export type SessionToken = typeof Schema.sessionTokens.$inferSelect;
export type Student = typeof Schema.students.$inferSelect;
export type UserSession = typeof Schema.userSessions.$inferSelect;
export type User = typeof Schema.users.$inferSelect;
