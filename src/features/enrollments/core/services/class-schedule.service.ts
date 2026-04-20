import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder } from "../../../../utils";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { ClassOfferingQuery } from "./class-offering-query.service";
import { DtoMappers } from "../dto-mappers";

export namespace ClassSchedule {
  const { roles } = Auth.Core.Data.Records;

  export async function createService() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);

    return new Service({
      classOfferingQuery: new ClassOfferingQuery.Service({ classOfferingRepo }),
    });
  }

  export class Service {
    private readonly _classOfferingQuery: ClassOfferingQuery.Service;

    public constructor(args: {
      classOfferingQuery: ClassOfferingQuery.Service;
    }) {
      this._classOfferingQuery = args.classOfferingQuery;
    }

    public async getForToday(args: {
      dbOrTx?: DbOrTx | undefined;
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
    }) {
      let offerings;
      try {
        offerings = await this._classOfferingQuery.getScheduledOfferings({
          ...args,
          scope: "today",
        });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          }),
        );
      }

      if (offerings.length === 0) return ResultBuilder.success([]);

      try {
        const parsed = offerings.map((row) =>
          DtoMappers.Query.ClassSchedule.map(row),
        );
        return ResultBuilder.success({ classes: parsed });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollment DTO",
            err,
          }),
        );
      }
    }

    public async getForTerm(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      dbOrTx?: DbOrTx | undefined;
    }) {
      let offerings;
      try {
        offerings = await this._classOfferingQuery.getScheduledOfferings({
          ...args,
          scope: "term",
        });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message: "Failed querying the `enrollments` table.",
            err,
          }),
        );
      }

      if (offerings.length === 0) return ResultBuilder.success([]);

      try {
        const distinctClasses = Array.from(
          new Map(
            offerings.map((row) => [row.class.classNumber, row]),
          ).values(),
        );

        const parsed = distinctClasses.map((row) =>
          DtoMappers.Query.ClassSchedule.map(row),
        );
        return ResultBuilder.success({ classes: parsed });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollment DTO",
            err,
          }),
        );
      }
    }
  }
}
