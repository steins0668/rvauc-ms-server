import { Schema } from "../../../models";

export namespace Db {
  export namespace InsertModels {
    export type ComplianceRecord = typeof Schema.complianceRecords.$inferInsert;
    export type UniformType = typeof Schema.uniformTypes.$inferInsert;
  }

  export namespace Tables {
    export type ComplianceRecord = typeof Schema.complianceRecords;
    export type UniformType = typeof Schema.uniformTypes;
  }

  export namespace ViewModels {
    export type ComplianceRecord = typeof Schema.complianceRecords.$inferSelect;
    export type UniformType = typeof Schema.uniformTypes.$inferSelect;
  }
}
