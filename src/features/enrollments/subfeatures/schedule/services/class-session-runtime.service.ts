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
     * Retrieves class session runtime details of the ongoing class.
     */
    async getForNow(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      tx?: TxContext | undefined;
    }) {
      let offering;
      let session;

      try {
        const result = await this._classRuntimeResolver.resolve({
          ...args,
          mode: "now",
        });

        offering = result.offering;
        session = result.session;
      } catch (err) {
        const internalError = {
          name: "ENROLLMENT_DATA_INTERNAL_ERROR",
          message: "Failed resolving class offering and/or session.",
        } as const;

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        const parsed = DtoMappers.Query.ClassSessionRuntime.map(
          offering,
          session,
        );

        return ResultBuilder.success({ class: parsed });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollment DTO",
            err,
          }),
        );
      }
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
      let offering;
      let session;

      try {
        const result = await this._classRuntimeResolver.resolve({
          ...args,
          mode: "now-or-next",
        });

        offering = result.offering;
        session = result.session;
      } catch (err) {
        const internalError = {
          name: "ENROLLMENT_DATA_INTERNAL_ERROR",
          message: "Failed resolving class offering and/or session.",
        } as const;

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        const parsed = DtoMappers.Query.ClassSessionRuntime.map(
          offering,
          session,
        );

        return ResultBuilder.success({ class: parsed });
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw query data into enrollment DTO",
            err,
          }),
        );
      }
    }
  }
}
