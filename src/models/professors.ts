import { relations } from "drizzle-orm";
import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { colleges } from "./colleges";

export const professors = sqliteTable("professors", {
  id: integer("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "restrict", onUpdate: "cascade" }),
  collegeId: integer("college_id")
    .notNull()
    .references(() => colleges.id),
  facultyRank: text("faculty_rank").notNull(),
});

export const professorsRelations = relations(professors, ({ one }) => ({
  user: one(users, {
    fields: [professors.id],
    references: [users.id],
  }),
  college: one(colleges, {
    fields: [professors.collegeId],
    references: [colleges.id],
  }),
}));
