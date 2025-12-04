import { Schema } from "../../../models";

export namespace InsertModels {
  export type ClassOffering = typeof Schema.classOfferings.$inferInsert;
  export type Enrollment = typeof Schema.enrollments.$inferInsert;
  export type Term = typeof Schema.terms.$inferInsert;
}

export namespace Tables {
  export type ClassOffering = typeof Schema.classOfferings;
  export type Enrollment = typeof Schema.enrollments;
  export type Term = typeof Schema.terms;
}

export namespace ViewModels {
  export type ClassOffering = typeof Schema.classOfferings.$inferSelect;
  export type Enrollment = typeof Schema.enrollments.$inferSelect;
  export type Term = typeof Schema.terms.$inferSelect;
}
