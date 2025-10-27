import { relations } from "drizzle-orm";
import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { userSessions } from "./user-sessions";

export const sessionTokens = sqliteTable(
  "session_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .notNull()
      .references(() => userSessions.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").unique().notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at"),
    isUsed: integer("is_used", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [uniqueIndex("session_tokens_token_hash_uidx").on(table.tokenHash)]
);

export const sessionTokensRelations = relations(sessionTokens, ({ one }) => ({
  session: one(userSessions, {
    fields: [sessionTokens.sessionId],
    references: [userSessions.id],
  }),
}));
