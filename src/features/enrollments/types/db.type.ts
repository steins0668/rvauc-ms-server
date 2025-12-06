import { Schema } from "../../../models";

export namespace InsertModels {
  export type Class = typeof Schema.classes.$inferInsert;
  export type ClassOffering = typeof Schema.classOfferings.$inferInsert;
  export type College = typeof Schema.colleges.$inferInsert;
  export type Course = typeof Schema.courses.$inferInsert;
  export type Department = typeof Schema.departments.$inferInsert;
  export type Enrollment = typeof Schema.enrollments.$inferInsert;
  export type Term = typeof Schema.terms.$inferInsert;
}

export namespace Tables {
  export type Class = typeof Schema.classes;
  export type ClassOffering = typeof Schema.classOfferings;
  export type College = typeof Schema.colleges;
  export type Course = typeof Schema.courses;
  export type Department = typeof Schema.departments;
  export type Enrollment = typeof Schema.enrollments;
  export type Term = typeof Schema.terms;
}

export namespace ViewModels {
  export type Class = typeof Schema.classes.$inferSelect;
  export type ClassOffering = typeof Schema.classOfferings.$inferSelect;
  export type College = typeof Schema.colleges.$inferSelect;
  export type Course = typeof Schema.courses.$inferSelect;
  export type Department = typeof Schema.departments.$inferSelect;
  export type Enrollment = typeof Schema.enrollments.$inferSelect;
  export type Term = typeof Schema.terms.$inferSelect;
}
