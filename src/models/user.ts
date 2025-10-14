import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { Role } from "./role";

export const User = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleId: integer("id")
    .notNull()
    .references(() => Role.id, { onDelete: "restrict" }),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").unique().notNull(),
  surname: text("surname").notNull(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  contact_number: text("contact_number"),
});
