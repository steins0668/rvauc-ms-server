import { relations } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { professors } from "./professors";
import { roles } from "./roles";
import { students } from "./students";
import { passwordResetTokens } from "./password-reset-tokens";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "restrict" }),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").unique().notNull(),
  surname: text("surname").notNull(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  contact_number: text("contact_number"),
});

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  student: one(students, {
    fields: [users.id],
    references: [students.id],
  }),
  passwordResetToken: one(passwordResetTokens, {
    fields: [users.id],
    references: [passwordResetTokens.userId],
  }),
  professor: one(professors, {
    fields: [users.id],
    references: [professors.id],
  }),
}));
