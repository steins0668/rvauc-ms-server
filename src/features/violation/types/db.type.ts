import { Schema } from "../../../models";

export namespace Db {
  export namespace InsertModels {
    export type ViolationRecord = typeof Schema.violationRecords.$inferInsert;
    export type ViolationStatus = typeof Schema.violationStatuses.$inferInsert;
  }
  export namespace Tables {
    export type ViolationRecord = typeof Schema.violationRecords;
    export type ViolationStatus = typeof Schema.violationStatuses;
  }
  export namespace ViewModels {
    export type ViolationRecord = typeof Schema.violationRecords.$inferSelect;
    export type ViolationStatus = typeof Schema.violationStatuses.$inferSelect;
  }
}
