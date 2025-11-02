import { relations, sql } from "drizzle-orm";
import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").unique().notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    isUsed: integer("is_used", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_active_token_uidx")
      .on(table.userId, table.isUsed)
      .where(sql`${table.isUsed} = false`),
  ]
);

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);
//  todo: add model, repository, service for password reset token
