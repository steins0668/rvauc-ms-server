import { relations, sql } from "drizzle-orm";
import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const passwordResetCodes = sqliteTable(
  "password_reset_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").unique().notNull(),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    isUsed: integer("is_used", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("password_reset_codes_active_code_uidx")
      .on(table.userId, table.isUsed)
      .where(sql`${table.isUsed} = false`),
  ]
);

export const passwordResetCodesRelations = relations(
  passwordResetCodes,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetCodes.userId],
      references: [users.id],
    }),
  })
);
