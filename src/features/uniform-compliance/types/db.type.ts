import { Schema } from "../../../models";

export namespace Db {
  export namespace InsertModels {
    export type ComplianceRecord = typeof Schema.complianceRecords.$inferInsert;
  }

  export namespace Tables {
    export type ComplianceRecord = typeof Schema.complianceRecords;
  }

  export namespace ViewModels {
    export type ComplianceRecord = typeof Schema.complianceRecords.$inferSelect;
  }
}
