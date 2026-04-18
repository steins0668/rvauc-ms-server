import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { classes, classSessions, enrollments, rooms } from "./schema";

export const classOfferings = sqliteTable("class_offerings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  weekDay: text("week_day").notNull(),
  roomId: integer("room_id").references(() => rooms.id, {
    onDelete: "restrict",
    onUpdate: "cascade",
  }),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time").notNull(),
  startTimeText: text("start_time_text").notNull(),
  endTimeText: text("end_time_text").notNull(),
});

export const classOfferingsRelations = relations(
  classOfferings,
  ({ one, many }) => ({
    class: one(classes, {
      fields: [classOfferings.classId],
      references: [classes.id],
    }),
    enrollments: many(enrollments),
    classSessions: many(classSessions),
    rooms: one(rooms, {
      fields: [classOfferings.roomId],
      references: [rooms.id],
    }),
  }),
);
