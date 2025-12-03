import { relations } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { classes } from "./classes";

export const classOfferings = sqliteTable("class_offerings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),
  classNumber: text("class_number").notNull(),
  weekDay: text("week_day").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
});

export const classOfferingsRelations = relations(classOfferings, ({ one }) => ({
  class: one(classes, {
    fields: [classOfferings.classId],
    references: [classes.id],
  }),
}));
