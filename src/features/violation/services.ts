import { createContext, DbOrTx } from "../../db/create-context";
import { DbAccess } from "../../error";
import { ResultBuilder } from "../../utils";
import { Repositories } from "./repositories";
import { Types } from "./types";

export namespace Services {
  export namespace ViolationData {
    export async function createService() {
      const context = await createContext();
      const violationRecordRepo = new Repositories.ViolationRecord(context);
      return new Service(violationRecordRepo);
    }

    export class Service {
      private readonly _violationRecordRepo: Repositories.ViolationRecord;

      constructor(violationRecordRepo: Repositories.ViolationRecord) {
        this._violationRecordRepo = violationRecordRepo;
      }

      public async storeRecord(args: {
        dbOrTx?: DbOrTx | undefined;
        value: Types.Db.InsertModels.ViolationRecord;
      }) {
        return await this.storeRecords({
          dbOrTx: args.dbOrTx,
          values: [args.value],
        });
      }

      public async storeRecords(args: {
        dbOrTx?: DbOrTx | undefined;
        values: Types.Db.InsertModels.ViolationRecord[];
      }) {
        return await this.insertRecord({
          dbOrTx: args.dbOrTx,
          fn: async (insert) => {
            return await insert
              .values(args.values)
              .onConflictDoNothing()
              .returning();
          },
        });
      }

      public async insertRecord<T>(
        args: Types.Repository.InsertArgs.ViolationRecord<T>
      ) {
        try {
          const inserted = await this._violationRecordRepo.execInsert(args);
          return ResultBuilder.success(inserted);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_INSERT_ERROR",
              message: "Failed inserting into `compliance_records` table.",
              err,
            })
          );
        }
      }

      public async findRecordsWhere(args: {
        dbOrTx?: DbOrTx;
        filter: Types.Repository.QueryFilters.ViolationRecord;
      }) {
        return await this.queryRecord({
          dbOrTx: args.dbOrTx,
          fn: async (query, converter) => {
            return await query.findMany({ where: converter(args.filter) });
          },
        });
      }

      public async queryRecord<T>(
        args: Types.Repository.QueryArgs.ViolationRecord<T>
      ) {
        try {
          const queried = await this._violationRecordRepo.execQuery(args);
          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed querying `compliance_records` table.",
              err,
            })
          );
        }
      }

      public async updateRecordWhere(args: {
        dbOrTx?: DbOrTx;
        values: Partial<Types.Db.ViewModels.ViolationRecord>;
        filter: Types.Repository.QueryFilters.ViolationRecord;
      }) {
        return await this.updateRecord({
          dbOrTx: args.dbOrTx,
          fn: async (update, converter) => {
            return await update
              .set(args.values)
              .where(converter(args.filter))
              .returning();
          },
        });
      }

      public async updateRecord<T>(
        args: Types.Repository.UpdateArgs.ViolationRecord<T>
      ) {
        try {
          const queried = await this._violationRecordRepo.execUpdate(args);
          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed updating `compliance_records` table.",
              err,
            })
          );
        }
      }

      public async deleteRecordWhere<T>(args: {
        dbOrTx?: DbOrTx;
        filter: Types.Repository.QueryFilters.ViolationRecord;
      }) {
        return await this.deleteRecord({
          dbOrTx: args.dbOrTx,
          fn: async (deleteBase, converter) => {
            return await deleteBase.where(converter(args.filter)).returning();
          },
        });
      }

      public async deleteRecord<T>(
        args: Types.Repository.DeleteArgs.ViolationRecord<T>
      ) {
        try {
          const queried = await this._violationRecordRepo.execDelete(args);
          return ResultBuilder.success(queried);
        } catch (err) {
          return ResultBuilder.fail(
            DbAccess.normalizeError({
              name: "DB_ACCESS_QUERY_ERROR",
              message: "Failed deleting from `compliance_records` table.",
              err,
            })
          );
        }
      }
    }
  }
}
