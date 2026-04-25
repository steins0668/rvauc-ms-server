import {
  createContext,
  DbOrTx,
  TxContext,
} from "../../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../../utils";
import { Auth } from "../../../../auth";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { DtoMappers } from "../dto-mappers";
import { Schemas } from "../schemas";

export namespace ClassSchedule {
  const { roles } = Auth.Core.Data.Records;

  export async function createService() {
    const context = await createContext();
    const classRepo = new CoreRepositories.Class(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    return new Service({
      classQuery: new Core.Services.ClassQuery.Service({ classRepo }),
      classOfferingQuery: new Core.Services.ClassOfferingQuery.Service({
        classOfferingRepo,
      }),
      enrollmentQuery: new Core.Services.EnrollmentQuery.Service({
        enrollmentRepo,
      }),
    });
  }

  export class Service {
    private readonly _classQuery: Core.Services.ClassQuery.Service;
    private readonly _classOfferingQuery: Core.Services.ClassOfferingQuery.Service;
    private readonly _enrollmentQuery: Core.Services.EnrollmentQuery.Service;

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
      classQuery: Core.Services.ClassQuery.Service;
      classOfferingQuery: Core.Services.ClassOfferingQuery.Service;
      enrollmentQuery: Core.Services.EnrollmentQuery.Service;
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

    public async getWeekly(args: {
      values: { classId: number; userId: number };
      role: keyof typeof roles;
      tx?: TxContext | undefined;
    }) {
      try {
        await this._classQuery.ensureClassAccess(args);

        const result =
          await this._classOfferingQuery.getWeeklyScheduleForClass(args);

        return ResultBuilder.success(
          DtoMappers.Query.WeeklySchedule.map(result),
        );
      } catch (err) {
        const internalErr = {
          name: "ENROLLMENT_DATA_INTERNAL_ERROR",
          message: `Failed getting schedule for ${args.role}`,
        } as const;

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalErr, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_QUERY_ERROR":
                  return create({ ...internalErr, cause: err });
              }
            },
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
          Core.Errors.EnrollmentData.collapseError({
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
