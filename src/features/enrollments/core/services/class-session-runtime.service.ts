import { ResultBuilder } from "../../../../utils";
import { createContext, TxContext } from "../../../../db/create-context";
import { Auth } from "../../../auth";
import { Repositories } from "../../repositories";
import { Errors } from "../errors";
import { Schemas } from "../schemas";
import { ClassOfferingQuery } from "./class-offering-query.service";
import { ClassRuntimeResolver } from "./class-runtime-resolver";
import { ClassSessionQuery } from "./class-session-query.service";

export namespace ClassSessionRuntime {
  const { roles } = Auth.Core.Data.Records;
  export async function create() {
    const context = await createContext();
    const classOfferingRepo = new Repositories.ClassOffering(context);
    const classSessionRepo = new Repositories.ClassSession(context);
    const classRuntimeResolver = new ClassRuntimeResolver.Service({
      classOfferingQuery: new ClassOfferingQuery.Service({ classOfferingRepo }),
      classSessionQuery: new ClassSessionQuery.Service({ classSessionRepo }),
    });
    return new Service({ classRuntimeResolver });
  }

  export class Service {
    private readonly _classRuntimeResolver: ClassRuntimeResolver.Service;

    constructor(args: { classRuntimeResolver: ClassRuntimeResolver.Service }) {
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

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
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed resolving class offering and/or session.",
            err,
          }),
        );
      }

      try {
        const parsed = this.toDto(offering, session);

        return ResultBuilder.success({ ...parsed });
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
        return ResultBuilder.fail(
          Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed resolving class offering and/or session.",
            err,
          }),
        );
      }

      try {
        const parsed = this.toDto(offering, session);

        return ResultBuilder.success({ ...parsed });
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

    private toDto(
      co: NonNullable<
        Awaited<
          ReturnType<Repositories.ClassOffering["queryWithClassAndProfessor"]>
        >[0]
      >,
      cs: NonNullable<
        Awaited<ReturnType<Repositories.ClassSession["getMinimalShape"]>>[0]
      >,
    ): {
      class: Schemas.Dto.Class_ & {
        course: Schemas.Dto.Course;
        offering: Schemas.Dto.ClassOffering;
        professor: Schemas.Dto.Professor;
        session: Schemas.Dto.ClassSession;
      };
    } {
      const { class: cls, rooms: r } = co;
      const { course: crs, professor: p } = co.class;

      return {
        class: {
          id: cls.id,
          classNumber: cls.classNumber,
          course: crs,
          offering: {
            id: co.id,
            weekDay: co.weekDay,
            room: r?.name ?? "N/A",
            startTimeText: co.startTimeText,
            endTimeText: co.endTimeText,
            startTime: co.startTime,
            endTime: co.endTime,
          },
          professor: {
            surname: p.user.surname,
            firstName: p.user.firstName,
            middleName: p.user.middleName,
            gender: p.user.gender,
            college: p.college.name,
            facultyRank: p.facultyRank,
          },
          session: Schemas.Dto.classSession.parse({
            id: cs.id,
            status: cs.status,
            datePh: cs.datePh,
            startTimeMs: cs.startTimeMs,
            endTimeMs: cs.endTimeMs,
          }),
        },
      };
    }
  }
}
