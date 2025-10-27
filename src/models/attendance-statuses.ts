import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";

export const attendanceStatuses = sqliteTable("attendance_statuses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
});
