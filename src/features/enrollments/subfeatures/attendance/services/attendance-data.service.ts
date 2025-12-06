import { createContext, DbOrTx } from "../../../../../db/create-context";
import { ResultBuilder, TimeUtil } from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";

export namespace AttendanceData {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    return new Service(attendanceRecordRepo);
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;

    constructor(attendanceRecordRepo: Repositories.AttendanceRecord) {
      this._attendanceRecordRepo = attendanceRecordRepo;
    }

    async getByStudentEnrollment(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      enrollmentId: number;
      studentId: number;
    }) {
      let queried;

      try {
        queried = await this.queryByStudentEnrollment(args);
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
      raw: Awaited<ReturnType<typeof this.queryByStudentEnrollment>>[number]
    ) {
      const dto = {
        id: raw.id,
        status: raw.status,
        date: raw.datePh,
        time: TimeUtil.toPhTime(new Date(raw.recordedAt)),
      };

      return Schemas.Dto.attendance.parse(dto);
    }

    private async queryByStudentEnrollment(args: {
      dbOrTx?: DbOrTx | undefined;
      constraints?: { limit?: number; page?: number };
      enrollmentId: number;
      studentId: number;
    }) {
      const { dbOrTx, constraints, enrollmentId, studentId } = args;

      const { limit = 6, page = 1 } = constraints ?? {};

      return this._attendanceRecordRepo.execQuery({
        dbOrTx,
        fn: (query, converter) =>
          query.findMany({
            where: converter({ enrollmentId, studentId }),
            columns: {
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
