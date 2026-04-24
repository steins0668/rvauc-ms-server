import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { ClassOfferingQuery } from "./class-offering-query.service";
import { DtoMappers } from "../dto-mappers";
import { Schemas } from "../schemas";
import { EnrollmentQuery } from "./enrollment-query.service";

export namespace ClassSchedule {
  const { roles } = Auth.Core.Data.Records;

  export async function createService() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const enrollmentRepo = new Repositories.Enrollment(context);
    return new Service({
      classOfferingQuery: new ClassOfferingQuery.Service({ classOfferingRepo }),
      enrollmentQuery: new EnrollmentQuery.Service({ enrollmentRepo }),
    });
  }

  export class Service {
    private readonly _classOfferingQuery: ClassOfferingQuery.Service;
    private readonly _enrollmentQuery: EnrollmentQuery.Service;

    public constructor(args: {
      classOfferingQuery: ClassOfferingQuery.Service;
      enrollmentQuery: EnrollmentQuery.Service;
    }) {
      this._classOfferingQuery = args.classOfferingQuery;
      this._enrollmentQuery = args.enrollmentQuery;
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
          Errors.EnrollmentData.collapseError({
            name: "ENROLLMENT_DATA_INTERNAL_ERROR",
            message: "Failed retrieving schedule today.",
            err,
          }),
        );
      }

      if (offerings.length === 0)
        return ResultBuilder.success({
          classes: [] as Schemas.Dto.ScheduledClassWithProfessor[],
        });

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
      let r;

      try {
        if (args.role === "professor")
          throw new Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_INTERNAL_ERROR",
            message: "Professor not supported temporarily.",
          });

        r = await this._enrollmentQuery.getEnrollmentsWithSchedule({
          values: {
            studentId: args.values.userId,
            termId: args.values.termId,
            timeMs: args.values.date.getTime(),
            datePh: TimeUtil.toPhDate(args.values.date),
          },
          dbOrTx: args.dbOrTx,
        });
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.collapseError({
            name: "ENROLLMENT_DATA_INTERNAL_ERROR",
            message: "Failed getting schedule for term.",
            err,
          }),
        );
      }

      if (r.length === 0)
        return ResultBuilder.success({
          classes: [] as Schemas.Dto.ClassList,
        });

      try {
        const seen = new Set<number>();

        const result = r.filter((row) => {
          const classId = row.class.id;

          if (seen.has(classId)) return false;

          seen.add(classId);
          return true;
        });

        const parsed = DtoMappers.Query.ClassList.map(result);
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
