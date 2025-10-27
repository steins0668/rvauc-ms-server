import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { departments } from "./departments";

export const uniformTypes = sqliteTable("uniform_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  departmentId: integer("department_id").references(() => departments.id, {
    onUpdate: "cascade",
    onDelete: "restrict",
  }),
  name: text("name"),
});
