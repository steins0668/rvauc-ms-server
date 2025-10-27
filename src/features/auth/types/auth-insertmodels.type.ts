import * as schema from "../../../models";

export type Professor = typeof schema.professors.$inferInsert;
export type Role = typeof schema.roles.$inferInsert;
export type SessionToken = typeof schema.sessionTokens.$inferInsert;
export type Student = typeof schema.students.$inferInsert;
export type User = typeof schema.users.$inferInsert;
export type UserSession = typeof schema.userSessions.$inferInsert;
