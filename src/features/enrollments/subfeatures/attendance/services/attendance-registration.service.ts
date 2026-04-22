import {
  createContext,
  execTransaction,
  TxContext,
} from "../../../../../db/create-context";
import { Clock, ResultBuilder } from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Repositories } from "../repositories";
import { DtoMappers } from "../dto-mappers";
import { Schemas } from "../schemas";
import { Utils } from "../utils";
import { AttendanceCommand } from "./attendance-command.service";

export namespace AttendanceRegistration {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    return new Service({
      attendanceCommand: new AttendanceCommand.Service({
        attendanceRecordRepo,
      }),
      classSessionQuery: new Core.Services.ClassSessionQuery.Service({
        classSessionRepo,
      }),
      enrollmentQueryService: new Core.Services.EnrollmentQuery.Service({
        enrollmentRepo,
      }),
      classRuntimeResolver: new Core.Services.ClassRuntimeResolver.Service({
        classOfferingQuery: new Core.Services.ClassOfferingQuery.Service({
          classOfferingRepo,
        }),
        classSessionQuery: new Core.Services.ClassSessionQuery.Service({
          classSessionRepo,
        }),
      }),
    });
  }

  export class Service {
    private readonly _attendanceCommand: AttendanceCommand.Service;
    private readonly _classSessionQuery: Core.Services.ClassSessionQuery.Service;
    private readonly _enrollmentQuery: Core.Services.EnrollmentQuery.Service;
    private readonly _classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;

    public constructor(args: {
      attendanceCommand: AttendanceCommand.Service;
      classSessionQuery: Core.Services.ClassSessionQuery.Service;
      enrollmentQueryService: Core.Services.EnrollmentQuery.Service;
      classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;
    }) {
      this._attendanceCommand = args.attendanceCommand;
      this._classSessionQuery = args.classSessionQuery;
      this._enrollmentQuery = args.enrollmentQueryService;
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

    /**
     * @description
     * Performs a transactional mutation of attendance records for a class session.
     *
     * The process includes:
     *
     * 1. Deduplicates incoming records by enrollment ID.
     * 2. Retrieves minimal class session metadata for validation and normalization.
     * 3. Validates and classifies records into upserts and rejects based on attendance policy rules.
     * 4. Executes a bulk upsert for valid records, updating or inserting attendance status and timestamps.
     * 5. Separates inserted vs updated records based on creation/update timestamps.
     * 6. Returns a normalized DTO containing updated, inserted, and rejected records.
     */
    async mutateSessionRecords(args: {
      values: {
        classSessionId: number;
        professorId?: number | undefined;
      } & Schemas.RequestBody.RecordSubmission;
      tx?: TxContext | undefined;
    }) {
      const { values } = args;

      //  * remove duplicate records
      const uniqueRecords = new Map<number, (typeof values.records)[number]>();

      for (const r of values.records) uniqueRecords.set(r.enrollmentId, r);

      values.records = Array.from(uniqueRecords.values());

      const txPromise = execTransaction(async (tx) => {
        //  * fetch session details
        const session = await this._classSessionQuery.ensureMinimalShape({
          where: (cs, { eq }) => eq(cs.id, values.classSessionId),
          dbOrTx: tx,
        });

        const enrolleeIds = await this._enrollmentQuery
          .getEnrolledIdsForClass({
            classId: session.classId,
            tx,
          })
          .then((r) => new Set(r.map((r) => r.id)));

        const organizedRecords =
          Utils.Policy.AttendanceSumbission.organizeRecords(
            session,
            enrolleeIds,
            values.records,
          );

        //  * auditing field
        const createdOrUpdatedAt = Clock.now().toISOString();

        const upserted = organizedRecords.upserts.length
          ? await this._attendanceCommand.upsertStatusAndRecordDateTime({
              tx,
              values: {
                classId: session.classId,
                classSessionId: session.id,
                datePh: session.datePh,
                createdAt: createdOrUpdatedAt,
                updatedAt: createdOrUpdatedAt,
                updatedByUserId: values.professorId,
                records: organizedRecords.upserts,
              },
            })
          : [];

        const inserted = upserted.filter((r) => r.createdAt === r.updatedAt);
        const updated = upserted.filter((r) => r.createdAt !== r.updatedAt);

        return { updated, inserted, rejected: organizedRecords.rejects };
      }, args.tx);

      let result;

      try {
        result = await txPromise;
      } catch (err) {
        const internalError = Core.Errors.EnrollmentData.internalError(
          "Failed mutating attendance records.",
        );

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_QUERY_ERROR":
                case "ENROLLMENT_DATA_STORE_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        return ResultBuilder.success(
          DtoMappers.Mutation.sessionRecordsMutationResult(
            result.updated,
            result.inserted,
            result.rejected,
          ),
        );
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message:
              "Failed to update and/or insert in attendance_records table.",
            err,
          }),
        );
      }
    }

    /**
     * @description
     * Performs a transactional submission of an attendance records for a student.
     *
     * The process includes:
     *
     * 1. Retrieves class, class offering, class session, and enrollment data.
     * 2. Infers attendance status based on the recorded date and the class offering schedule.
     * 3. Persists the record into the database.
     * 4. Maps the result into a DTO.
     */
    async recordSessionAttendance(args: {
      values: {
        termId: number;
        studentId: number;
        recordedDate: Date;
      };
      tx?: TxContext | undefined;
    }) {
      const { recordedDate } = args.values;
      const txPromise = execTransaction(async (tx) => {
        const { clsRuntime, enrollment } =
          await this.ensureEnrollmentForRuntime({
            values: args.values,
            tx,
          });

        const status = Utils.Policy.Attendance.getAttendanceStatus({
          values: {
            attendanceTime: recordedDate.getTime(),
            session: clsRuntime.session,
          },
        });

        const inserted = await this._attendanceCommand.persistSessionAttendance(
          {
            values: {
              classId: clsRuntime.offering.class.id,
              classSessionId: clsRuntime.session.id,
              status,
              enrollmentId: enrollment.id,
              recordedDate,
            },
            tx,
          },
        );

        return { clsRuntime, inserted };
      }, args.tx);

      let txResult;

      try {
        txResult = await txPromise;
      } catch (err) {
        const internalError = Core.Errors.EnrollmentData.internalError(
          "Failed recording attendance for session.",
        );

        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.translateError({
            fallback: { ...internalError, err },
            map: (err, create) => {
              switch (err.name) {
                case "ENROLLMENT_DATA_STORE_ERROR":
                case "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR":
                  return create({ ...internalError, cause: err });
              }
            },
          }),
        );
      }

      try {
        const dto = DtoMappers.Mutation.sessionAttendanceResult(
          txResult.clsRuntime,
          txResult.inserted,
        );

        return ResultBuilder.success(dto);
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_DTO_CONVERSION_ERROR",
            message:
              "Failed to convert scan attendance registration result to dto",
            err,
          }),
        );
      }
    }

    private async ensureEnrollmentForRuntime(args: {
      values: { termId: number; studentId: number; recordedDate: Date };
      tx?: TxContext | undefined;
    }) {
      const { tx } = args;
      const { termId, studentId, recordedDate } = args.values;

      try {
        const clsRuntime = await this._classRuntimeResolver.resolve({
          values: { termId, userId: studentId, date: recordedDate },
          role: "student",
          mode: "now",
          sessionPolicy: "strict-scheduled",
          tx,
        });

        const enrollment = await this._enrollmentQuery.ensureForClassAndStudent(
          {
            values: { studentId, classId: clsRuntime.offering.class.id },
            dbOrTx: tx,
          },
        );

        return { clsRuntime, enrollment };
      } catch (err) {
        const internalError = {
          name: "ENROLLMENT_DATA_INTERNAL_ERROR",
          message: "Failed recording attendance for session.",
        } as const;

        throw Core.Errors.EnrollmentData.translateError({
          fallback: { ...internalError, err },
          map: (err, create) => {
            switch (err.name) {
              case "ENROLLMENT_DATA_QUERY_ERROR":
                return create({ ...internalError, cause: err });
              case "ENROLLMENT_DATA_ENROLLMENT_NOT_FOUND_ERROR":
                return create({
                  name: "ENROLLMENT_DATA_INCONSISTENT_STATE_ERROR",
                  message:
                    "A class runtime was resolved for the provided student, but the enrollment could not be found.",
                  cause: err,
                });
            }
          },
        });
      }
    }
  }
}
