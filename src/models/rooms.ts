import {
  integer,
  text,
  sqliteTable,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const rooms = sqliteTable(
  "rooms",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    building: text("building"),
  },
  (t) => [uniqueIndex("uidx_rooms_name_building").on(t.name, t.building)],
);
