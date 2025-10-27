import { Schema } from "../../../models";

export type Professor = typeof Schema.professors.$inferInsert;
export type Role = typeof Schema.roles.$inferInsert;
export type SessionToken = typeof Schema.sessionTokens.$inferInsert;
export type Student = typeof Schema.students.$inferInsert;
export type User = typeof Schema.users.$inferInsert;
export type UserSession = typeof Schema.userSessions.$inferInsert;
