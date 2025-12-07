import { createContext, DbOrTx } from "../../../../../db/create-context";
import { RepositoryUtil, ResultBuilder, TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";

export namespace AttendanceData {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    return new Service({ attendanceRecordRepo, classRepo });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classRepo: CoreRepositories.Class;

    constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classRepo: CoreRepositories.Class;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classRepo = args.classRepo;
    }

    async getByStudentClassTerm(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      classNumber: string;
      studentId: number;
      termId: number;
    }) {
      let queried;

      try {
        queried = await this.queryByStudentClassTerm(args);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message:
              "Failed getting attendance records for student and enrollment.",
            err,
          })
        );
      }

      try {
        const dtoList = queried.map((raw) => this.toDto(raw));
        return ResultBuilder.success(dtoList);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          })
        );
      }
    }

    private toDto(
      raw: Awaited<ReturnType<typeof this.queryByStudentClassTerm>>[number]
    ) {
      const dto = {
        id: raw.id,
        status: raw.status,
        date: raw.datePh,
        time: TimeUtil.toPhTime(new Date(raw.recordedAt)),
      };

      return Schemas.Dto.attendance.parse(dto);
    }

    private async queryByStudentClassTerm(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      classNumber: string;
      studentId: number;
      termId: number;
    }) {
      const { dbOrTx, constraints, classNumber, studentId, termId } = args;

      const { limit = 6, page = 1 } = constraints ?? {};

      const { and, eq } = RepositoryUtil.filters;

      const classSq = this._classRepo.getContext({
        dbOrTx,
        fn: ({ table: c, context }) =>
          context
            .select({ id: c.id })
            .from(c)
            .where(and(eq(c.classNumber, classNumber), eq(c.termId, termId))),
      });

      return this._attendanceRecordRepo.execQuery({
        dbOrTx,
        fn: (query) =>
          query.findMany({
            where: (ar, { exists }) =>
              and(eq(ar.studentId, studentId), exists(classSq)),
            columns: {
              classId: false,
              enrollmentId: false,
              studentId: false,
              recordCount: false,
            },
            orderBy: (ar, { desc }) => desc(ar.recordedMs), //  ! sort by latest
            limit,
            offset: (page - 1) * limit,
          }),
      });
    }
  }
}
