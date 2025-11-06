import { relations } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const signInRequests = sqliteTable("sign_in_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  codeHash: text("code_hash").unique().notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  isUsed: integer("is_used", { mode: "boolean" }).notNull().default(false),
});

export const signInRequestsRelations = relations(signInRequests, ({ one }) => ({
  user: one(users, {
    fields: [signInRequests.userId],
    references: [users.id],
  }),
}));
