import { Schema } from "../../../models";

export namespace Db {
  export namespace InsertModels {
    export type ViolationRecord = typeof Schema.violationRecords.$inferInsert;
  }
  export namespace Tables {
    export type ViolationRecord = typeof Schema.violationRecords;
  }
  export namespace ViewModels {
    export type ViolationRecord = typeof Schema.violationRecords.$inferSelect;
  }
}
