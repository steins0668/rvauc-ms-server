import { createContext, DbOrTx } from "../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../utils";
import { Auth } from "../../../auth";
import { Core } from "../../core";
import { Repositories as CoreRepositories } from "../../repositories";
import { DtoMappers } from "./dto-mappers";
import { Schemas } from "./schemas";

export namespace Services {
  export namespace ClassSchedule {
    const { roles } = Auth.Core.Data.Records;

    export async function createService() {
      const context = await createContext();
      const classRepo = new CoreRepositories.Class(context);
      const enrollmentRepo = new CoreRepositories.Enrollment(context);
      return new Service({
        classQuery: new Core.Services.ClassQuery.Service({ classRepo }),
        enrollmentQuery: new Core.Services.EnrollmentQuery.Service({
          enrollmentRepo,
        }),
      });
    }

    export class Service {
      private readonly _classQuery: Core.Services.ClassQuery.Service;
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
        enrollmentQuery: Core.Services.EnrollmentQuery.Service;
      }) {
        this._classQuery = args.classQuery;
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
}
