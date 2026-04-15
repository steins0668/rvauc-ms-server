import { relations } from "drizzle-orm";
import {
  sqliteTable,
  index,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { classes } from "./classes";
import { classOfferings } from "./class-offerings";

export const classSessions = sqliteTable(
  "class_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    classOfferingId: integer("class_offering_id")
      .notNull()
      .references(() => classOfferings.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    datePh: text("date_ph").notNull(), //  * Ph timezone date (yyyy-mm-dd)
    startTimeMs: integer("start_ms").notNull(), //  * UTC ms (in ph timezone) of when the schedule starts
    endTimeMs: integer("end_ms").notNull(), //  * UTC ms (in ph timezone) of when the schedule ends
    createdAt: text("created_at").notNull(), //  * UTC ISO Date (when the record was created)
    updatedAt: text("updated_at").notNull(), //  * UTC ISO Date (when the record was updated)
  },
  (t) => [
    index("idx_class_sessions_date_ph").on(t.datePh),
    uniqueIndex("uidx_class_sessions_class_offering_id_date_ph").on(
      t.classOfferingId,
      t.datePh,
    ),
  ],
);

export const classSessionsRelations = relations(classSessions, ({ one }) => ({
  class: one(classes, {
    fields: [classSessions.classId],
    references: [classes.id],
  }),
  classOffering: one(classOfferings, {
    fields: [classSessions.classOfferingId],
    references: [classOfferings.id],
  }),
}));
