import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { Department } from "./department";

export const UniformType = sqliteTable("uniform_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  departmentId: integer("department_id").references(() => Department.id, {
    onUpdate: "cascade",
    onDelete: "restrict",
  }),
  name: text("name"),
});
