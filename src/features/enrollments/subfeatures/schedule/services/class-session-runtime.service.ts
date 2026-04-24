import { ResultBuilder } from "../../../../../utils";
import { createContext, TxContext } from "../../../../../db/create-context";
import { Auth } from "../../../../auth";
import { Repositories } from "../../../repositories";
import { Core } from "../../../core";
import { DtoMappers } from "../dto-mappers";

export namespace ClassSessionRuntime {
  const { roles } = Auth.Core.Data.Records;
  export async function create() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    const classRuntimeResolver = new Core.Services.ClassRuntimeResolver.Service(
      {
        classOfferingQuery: new Core.Services.ClassOfferingQuery.Service({
          classOfferingRepo,
        }),
        classSessionQuery: new Core.Services.ClassSessionQuery.Service({
          classSessionRepo,
        }),
      },
    );
    return new Service({ classRuntimeResolver });
  }

  export class Service {
    private readonly _classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;

    constructor(args: {
      classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;
    }) {
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

    /**
     * @description
     * Retrieves class session runtime details of the ongoing class or the next scheduled class.
     */
    async getForNowOrNext(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      tx?: TxContext | undefined;
    }) {
      const { values, role, tx } = args;

      try {
        return ResultBuilder.success(
          role === "student"
            ? await this.getForStudent({ values, role, tx })
            : await this.getForProfessor({ values, role, tx }),
        );
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_INTERNAL_ERROR",
            message: `Failed resolving runtime for ${args.role}`,
            err,
          }),
        );
      }
    }

    private async getForStudent(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: typeof roles.student;
      tx?: TxContext | undefined;
    }) {
      const runtime = await this._classRuntimeResolver.resolveActiveClass({
        ...args,
        mode: "now-or-next",
      });

      try {
        return DtoMappers.Query.ClassSessionRuntime.mapStudentView(runtime);
      } catch (err) {
        throw Core.Errors.EnrollmentData.collapseError({
          name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
          message: "Failed mapping data to dto.",
          err,
        });
      }
    }

    private async getForProfessor(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: typeof roles.professor;
      tx?: TxContext | undefined;
    }) {
      const runtime = await this._classRuntimeResolver.resolveActiveClass({
        ...args,
        mode: "now-or-next",
      });

      try {
        return DtoMappers.Query.ClassSessionRuntime.mapProfessorView(runtime);
      } catch (err) {
        throw Core.Errors.EnrollmentData.collapseError({
          name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
          message: "Failed mapping data to dto.",
          err,
        });
      }
    }
  }
}
