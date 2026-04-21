import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../db/create-context";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { ClassOfferingQuery } from "./class-offering-query.service";
import { ClassSessionQuery } from "./class-session-query.service";

export namespace ClassRuntimeResolver {
  const { roles } = Auth.Core.Data.Records;
  export async function create() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);

    return new Service({
      classOfferingQuery: new ClassOfferingQuery.Service({ classOfferingRepo }),
      classSessionQuery: new ClassSessionQuery.Service({ classSessionRepo }),
    });
  }

  export class Service {
    private readonly _classOfferingQuery: ClassOfferingQuery.Service;
    private readonly _classSessionQuery: ClassSessionQuery.Service;

    constructor(args: {
      classOfferingQuery: ClassOfferingQuery.Service;
      classSessionQuery: ClassSessionQuery.Service;
    }) {
      this._classOfferingQuery = args.classOfferingQuery;
      this._classSessionQuery = args.classSessionQuery;
    }

    /**
     * @description
     * Resolves a class with its details and session based on various aruguments.
     */
    async resolve(args: {
      values: {
        date: Date;
        termId: number;
        userId: number;
      };
      role: keyof typeof roles;
      mode: "now" | "now-or-next";
      sessionPolicy?: "strict-scheduled" | "default";
      tx?: TxContext | undefined;
    }) {
      const { date, termId, userId } = args.values;

      const txPromise = execTransaction(async (tx) => {
        const offering = await this._classOfferingQuery.ensureActiveOffering({
          values: { date, termId, userId },
          role: args.role,
          mode: args.mode,
          tx,
        });
        const session =
          args.sessionPolicy === "strict-scheduled"
            ? await this._classSessionQuery.ensureOfferingActiveSessionNotCancelled(
                {
                  values: { date, classOfferingId: offering.id },
                  mode: args.mode,
                  tx,
                },
              )
            : await this._classSessionQuery.ensureOfferingActiveSession({
                values: { date, classOfferingId: offering.id },
                mode: args.mode,
                tx,
              });

        return { offering, session };
      }, args.tx);

      try {
        return await txPromise;
      } catch (err) {
        const internalError = {
          name: "ENROLLMENT_DATA_INTERNAL_ERROR",
          message: "Failed resolving class offering and/or session runtime.",
        } as const;

        throw Errors.EnrollmentData.translateError({
          fallback: {
            name: internalError.name,
            message: internalError.message,
            err,
          },
          map: (err, create) => {
            switch (err.name) {
              case "ENROLLMENT_DATA_QUERY_ERROR":
                return create({
                  name: internalError.name,
                  message: internalError.message,
                  cause: err,
                });
              case "ENROLLMENT_DATA_CLASS_OFFERING_NOT_FOUND_ERROR":
                return create({
                  name: "ENROLLMENT_DATA_NO_ACTIVE_CLASS_ERROR",
                  message: `This ${args.role} does not have an ongoing class.`,
                  cause: err,
                });
              case "ENROLLMENT_DATA_CLASS_SESSION_NOT_FOUND_ERROR":
                return create({
                  name: "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR",
                  message: "Expected a session for the found offering.",
                  cause: err,
                });
            }
          },
        });
      }
    }
  }
}
