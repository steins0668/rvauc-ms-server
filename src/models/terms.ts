import { sqliteTable, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const terms = sqliteTable(
  "terms",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    yearStart: integer("year_start").notNull(),
    yearEnd: integer("year_end").notNull(),
    semester: integer("semester").notNull(),
  },
  (table) => [
    uniqueIndex("uidx_terms_start_end_semester").on(
      table.yearStart,
      table.yearEnd,
      table.semester
    ),
  ]
);
