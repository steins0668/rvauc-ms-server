import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { DtoMappers } from "../dto-mappers";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { ClassQuery } from "./class-query.service";
import { ClassOfferingQuery } from "./class-offering-query.service";
import { EnrollmentQuery } from "./enrollment-query.service";

export namespace ClassSchedule {
  const { roles } = Auth.Core.Data.Records;

  export async function createService() {
    const context = await createContext();
    const classRepo = new Repositories.Class(context);
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const enrollmentRepo = new Repositories.Enrollment(context);
    return new Service({
      classQuery: new ClassQuery.Service({ classRepo }),
      classOfferingQuery: new ClassOfferingQuery.Service({ classOfferingRepo }),
      enrollmentQuery: new EnrollmentQuery.Service({ enrollmentRepo }),
    });
  }

  export class Service {
    private readonly _classQuery: ClassQuery.Service;
    private readonly _classOfferingQuery: ClassOfferingQuery.Service;
    private readonly _enrollmentQuery: EnrollmentQuery.Service;

    private readonly _classListResolver: {
      [roles.student]: (args: {
        values: {
          date: Date;
          termId: number;
          userId: number;
        };
        dbOrTx?: DbOrTx | undefined;
      }) => Promise<Schemas.Dto.ClassList>;
      [roles.professor]: (args: {
        values: {
          date: Date;
          termId: number;
          userId: number;
        };
        dbOrTx?: DbOrTx | undefined;
      }) => Promise<Schemas.Dto.ClassList>;
    };

    public constructor(args: {
      classQuery: ClassQuery.Service;
      classOfferingQuery: ClassOfferingQuery.Service;
      enrollmentQuery: EnrollmentQuery.Service;
    }) {
      this._classQuery = args.classQuery;
      this._classOfferingQuery = args.classOfferingQuery;
      this._enrollmentQuery = args.enrollmentQuery;

      this._classListResolver = {
        student: async (args) => {
          const r = await this._enrollmentQuery.getEnrollmentsWithSchedule({
            values: {
              studentId: args.values.userId,
              termId: args.values.termId,
              datePh: TimeUtil.toPhDate(args.values.date),
              timeMs: args.values.date.getTime(),
            },
          });

          const filtered = this.dedupeByClass(r);

          return DtoMappers.Query.ClassList.mapStudentView(filtered);
        },
        professor: async (args) => {
          const r = await this._classQuery.getProfessorClassesWithSchedule({
            values: {
              professorId: args.values.userId,
              termId: args.values.termId,
              datePh: TimeUtil.toPhDate(args.values.date),
              timeMs: args.values.date.getTime(),
            },
          });

          const filtered = this.dedupeByClass(r);

          return DtoMappers.Query.ClassList.mapProfessorView(filtered);
        },
      };
    }

    //  to be updated
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
      try {
        const result = await this._classListResolver[args.role](args);

        return ResultBuilder.success(result);
      } catch (err) {
        return ResultBuilder.fail(
          Errors.EnrollmentData.collapseError({
            name: "ENROLLMENT_DATA_INTERNAL_ERROR",
            message: `Failed getting schedule for ${args.role}.`,
            err,
          }),
        );
      }
    }

    private dedupeByClass<T extends { class: { id: number } }>(rows: T[]) {
      const seen = new Set<number>();

      return rows.filter((row) => {
        if (seen.has(row.class.id)) return false;
        seen.add(row.class.id);
        return true;
      });
    }
  }
}
