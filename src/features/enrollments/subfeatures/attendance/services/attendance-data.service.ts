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

    async getStudentAttendance(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      classId: number;
      studentId: number;
    }) {
      let queried;

      try {
        queried = await this.queryStudentAttendance(args);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message:
              "Failed getting attendance records for student and enrollment.",
            err,
          }),
        );
      }

      try {
        const dtoList = queried.map((raw) => this.toStudentAttendanceDto(raw));
        return ResultBuilder.success(dtoList);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message: "Failed converting raw attendance to dto",
            err,
          }),
        );
      }
    }

    private toStudentAttendanceDto(
      raw: Awaited<ReturnType<typeof this.queryStudentAttendance>>[number],
    ) {
      const dto = {
        id: raw.id,
        status: raw.status,
        date: raw.datePh,
        time: TimeUtil.toPhTime(new Date(raw.recordedAt)),
      };

      return Schemas.Dto.studentAttendance.parse(dto);
    }

    private async queryStudentAttendance(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      classId: number;
      studentId: number;
    }) {
      const { dbOrTx, constraints, classId, studentId } = args;

      const { limit = 6, page = 1 } = constraints ?? {};

      const { and, eq } = RepositoryUtil.filters;

      return this._attendanceRecordRepo.execQuery({
        dbOrTx,
        fn: (query) =>
          query.findMany({
            where: (ar) =>
              and(eq(ar.studentId, studentId), eq(ar.classId, classId)),
            columns: {
              classId: false,
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
