import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { User } from "./user";
import { College } from "./college";

export const Professor = sqliteTable("professors", {
  id: integer("id")
    .primaryKey()
    .references(() => User.id, { onDelete: "restrict", onUpdate: "cascade" }),
  collegeId: integer("college_id")
    .notNull()
    .references(() => College.id),
  facultyRank: text("faculty_rank").notNull(),
});
