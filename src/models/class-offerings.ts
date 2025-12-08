import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { classes, enrollments } from "./schema";

export const classOfferings = sqliteTable("class_offerings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  weekDay: text("week_day").notNull(),
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
  })
);
