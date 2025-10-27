import * as schema from "../../../models";

export type Professor = typeof schema.professors.$inferSelect;
export type Role = typeof schema.roles.$inferSelect;
export type SessionToken = typeof schema.sessionTokens.$inferSelect;
export type Student = typeof schema.students.$inferSelect;
export type UserSession = typeof schema.userSessions.$inferSelect;
export type User = typeof schema.users.$inferSelect;
