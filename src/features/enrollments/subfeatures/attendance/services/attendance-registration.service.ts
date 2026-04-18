import {
  createContext,
  DbOrTx,
  execTransaction,
  TxContext,
} from "../../../../../db/create-context";
import { DbAccess } from "../../../../../error";
import { Schema } from "../../../../../models";
import {
  Clock,
  RepositoryUtil,
  ResultBuilder,
  TimeUtil,
} from "../../../../../utils";
import { Core } from "../../../core";
import { Repositories as CoreRepositories } from "../../../repositories";
import { Data } from "../data";
import { Repositories } from "../repositories";
import { Schemas } from "../schemas";
import { Types } from "../types";
import { Utils } from "../utils";

export namespace AttendanceRegistration {
  export async function create() {
    const context = await createContext();
    const attendanceRecordRepo = new Repositories.AttendanceRecord(context);
    const classRepo = new CoreRepositories.Class(context);
    const classOfferingRepo = new CoreRepositories.ClassOffering(context);
    const classSessionRepo = new CoreRepositories.ClassSession(context);
    const enrollmentRepo = new CoreRepositories.Enrollment(context);
    const classRuntimeResolver = new Core.Services.ClassRuntimeResolver.Service(
      {
        classRepo,
        classOfferingRepo,
        classSessionRepo,
        enrollmentRepo,
      },
    );
    return new Service({
      attendanceRecordRepo,
      classSessionRepo,
      enrollmentRepo,
      classRuntimeResolver,
    });
  }

  export class Service {
    private readonly _attendanceRecordRepo: Repositories.AttendanceRecord;
    private readonly _classSessionRepo: CoreRepositories.ClassSession;
    private readonly _enrollmentRepo: CoreRepositories.Enrollment;
    private readonly _classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;

    public constructor(args: {
      attendanceRecordRepo: Repositories.AttendanceRecord;
      classSessionRepo: CoreRepositories.ClassSession;
      enrollmentRepo: CoreRepositories.Enrollment;
      classRuntimeResolver: Core.Services.ClassRuntimeResolver.Service;
    }) {
      this._attendanceRecordRepo = args.attendanceRecordRepo;
      this._classSessionRepo = args.classSessionRepo;
      this._enrollmentRepo = args.enrollmentRepo;
      this._classRuntimeResolver = args.classRuntimeResolver;
    }

    async mutateRecords(args: {
      values: {
        classSessionId: number;
        date: Date;
        professorId?: number | undefined;
        records: {
          recordedDate: Date;
          studentId: number;
          enrollmentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      const uniqueRecords = new Map<number, (typeof values.records)[number]>();

      for (const r of values.records) uniqueRecords.set(r.studentId, r);

      values.records = Array.from(uniqueRecords.values());

      const normalizeRecord = (r: (typeof values.records)[number]) => {
        //  todo: automate setting recordedAt to end of class time when status = absent
        return {
          ...r,
          recordedAt: r.recordedDate.toISOString(),
          recordedMs: r.recordedDate.getTime(),
          datePh: TimeUtil.toPhDate(r.recordedDate),
        };
      };

      const organizeRecords = (
        existingStudentIds: Set<number>,
        session: { datePh: string; startTimeMs: number; endTimeMs: number },
      ) => {
        let updates: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
        let inserts: Schemas.Dto.ClassAttendance.NormalizedRecords = [];
        let rejects: Schemas.Dto.ClassAttendance.NormalizedRecords = [];

        for (const r of values.records) {
          const normalized = normalizeRecord(r);

          const exists = existingStudentIds.has(normalized.studentId);

          const isSameDate = normalized.datePh === session.datePh;

          if (
            !isSameDate ||
            !Utils.AttendancePolicy.isWithinSchedule(
              normalized.recordedDate,
              session,
            )
          ) {
            rejects.push(normalized);
            continue;
          }

          exists ? updates.push(normalized) : inserts.push(normalized);
        }

        return { updates, inserts, rejects };
      };

      const createdOrUpdatedAt = Clock.now().toISOString();

      const txPromise = this._attendanceRecordRepo.execTransaction(
        async (tx) => {
          const session = await this.getSession({
            values: { id: values.classSessionId },
            tx,
          });

          const studentIds = values.records.map((r) => r.studentId);

          const existingStudentIds = await this.getExistingRecords({
            values: {
              classId: session.classId,
              classOfferingId: session.classOfferingId,
              datePh: session.datePh,
              studentIds,
            },
            dbOrTx: tx,
          });

          const organizedRecords = organizeRecords(existingStudentIds, session);

          const updated = organizedRecords.updates.length
            ? await this.updateRecords({
                dbOrTx: tx,
                values: {
                  classId: session.classId,
                  classOfferingId: session.classOfferingId,
                  updatedAt: createdOrUpdatedAt,
                  updatedByUserId: values.professorId,
                  records: organizedRecords.updates,
                },
              })
            : [];

          const inserted = organizedRecords.inserts.length
            ? await this.insertRecords({
                dbOrTx: tx,
                onConflict: "doNothing",
                values: organizedRecords.inserts.map((r) => {
                  return {
                    classId: session.classId,
                    classOfferingId: session.classOfferingId,
                    classSessionId: session.id,
                    studentId: r.studentId,
                    enrollmentId: r.enrollmentId,
                    status: r.status,
                    createdAt: createdOrUpdatedAt,
                    recordedAt: r.recordedAt,
                    recordedMs: r.recordedMs,
                    updatedAt: createdOrUpdatedAt,
                    updatedByUserId: values.professorId ?? null,
                    datePh: r.datePh,
                  };
                }),
              })
            : [];

          return { updated, inserted, rejected: organizedRecords.rejects };
        },
        dbOrTx,
      );

      try {
        const result = await txPromise;

        return ResultBuilder.success(
          this.toAttendanceRecordMutationResultDto(
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

    async recordSessionAttendance(args: {
      values: {
        termId: number;
        studentId: number;
        recordedDate: Date;
      };
      tx?: TxContext | undefined;
    }) {
      const { termId, studentId, recordedDate } = args.values;
      const txPromise = execTransaction(async (tx) => {
        const clsRuntime = await this._classRuntimeResolver.resolve({
          values: { termId, userId: studentId, date: recordedDate },
          role: "student",
          mode: "now",
          sessionPolicy: "strict-scheduled",
          tx,
        });

        const enrollment = await this.getEnrollment({
          values: { studentId, classOfferingId: clsRuntime.offering.id },
          tx,
        });

        const status = Utils.AttendancePolicy.getAttendanceStatus({
          attendanceDate: recordedDate,
          schedStartTime: clsRuntime.offering.startTime,
          schedEndTime: clsRuntime.offering.endTime,
        });

        const inserted = await this.persistSessionAttendance({
          values: {
            clsRuntime,
            studentId,
            status,
            enrollmentId: enrollment.id,
            recordedDate,
          },
          tx,
        });

        return { clsRuntime, inserted };
      }, args.tx);

      let txResult;

      try {
        txResult = await txPromise;
      } catch (err) {
        return ResultBuilder.fail(
          Core.Errors.EnrollmentData.normalizeError({
            name: "ENROLLMENT_DATA_TRANSACTION_ERROR",
            message: "Failed storing attendance record from scan.",
            err,
          }),
        );
      }

      try {
        const dto = this.toSessionAttendanceDto(
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

    private toAttendanceRecordMutationResultDto(
      updated: Awaited<ReturnType<typeof this.updateRecords>>,
      inserted: Awaited<ReturnType<typeof this.insertRecords>>,
      rejected: Schemas.Dto.ClassAttendance.NormalizedRecords,
    ): Schemas.Dto.ClassAttendance.MutationResult {
      const updatedDto = updated.map((r) => {
        return {
          id: r.id,
          status: r.status,
          date: r.datePh,
          time: TimeUtil.toPhTime(new Date(r.recordedAt)),
          isNew: r.recordCount === 1,
        };
      });

      const insertedDto = inserted.map((r) => {
        return {
          id: r.id,
          status: r.status,
          date: r.datePh,
          time: TimeUtil.toPhTime(new Date(r.recordedAt)),
          isNew: r.recordCount === 1,
        };
      });

      return { updated: updatedDto, inserted: insertedDto, rejected };
    }

    private toSessionAttendanceDto(
      classRuntime: Awaited<
        ReturnType<Core.Services.ClassRuntimeResolver.Service["resolve"]>
      >,
      attendance: NonNullable<
        Awaited<ReturnType<typeof this.insertRecords>>[number]
      >,
    ): Schemas.Dto.ClassAttendance.SessionAttendanceResult {
      const { offering: co, session: cs } = classRuntime;
      const { class: cls, rooms: r } = co;
      const { course: crs, professor: p } = cls;

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
          session: {
            id: cs.id,
            classOfferingId: cs.classOfferingId,
            status: cs.status,
            datePh: cs.datePh,
            startTimeMs: cs.startTimeMs,
            endTimeMs: cs.endTimeMs,
          },
        },
        attendance: {
          id: attendance.id,
          status: attendance.status,
          date: attendance.datePh,
          time: TimeUtil.toPhTime(new Date(attendance.recordedAt)),
          isNew: attendance.recordCount === 1,
        },
      };
    }

    private async persistSessionAttendance(args: {
      values: {
        clsRuntime: Awaited<
          ReturnType<Core.Services.ClassRuntimeResolver.Service["resolve"]>
        >;
        studentId: number;
        enrollmentId: number;
        status: string;
        recordedDate: Date;
      };
      tx?: TxContext | undefined;
    }) {
      const { tx } = args;
      const { clsRuntime, studentId, enrollmentId, status, recordedDate } =
        args.values;

      const { offering, session } = clsRuntime;
      const { class: cls } = offering;

      const nowIso = Clock.now().toISOString();
      const recordedDateIso = recordedDate.toISOString();
      const recordedDateMs = recordedDate.getTime();

      const inserted = await this.insertRecords({
        dbOrTx: tx,
        onConflict: "doUpdate",
        values: [
          {
            studentId,
            enrollmentId,
            classId: cls.id,
            classOfferingId: offering.id,
            classSessionId: session.id,
            status,
            createdAt: nowIso,
            recordedAt: recordedDateIso,
            recordedMs: recordedDateMs,
            updatedAt: nowIso,
            datePh: TimeUtil.toPhDate(recordedDate),
          },
        ],
      }).then((r) => r[0]);

      if (inserted === undefined)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed storing attendance record.",
        });

      return inserted;
    }

    private async insertRecords(args: {
      dbOrTx?: DbOrTx | undefined;
      onConflict?: "doNothing" | "doUpdate" | undefined;
      values: Types.InsertModels.AttendanceRecord[];
    }) {
      const { dbOrTx, onConflict = "doNothing", values } = args;
      const insert = this._attendanceRecordRepo.execInsert({
        dbOrTx,
        fn: async ({ table: ar, insert, sql }) => {
          let insertion = insert.values(values);

          const targets = [
            sql`student_id`,
            sql`class_id`,
            sql`class_offering_id`,
            sql`date_ph`,
          ];

          insertion =
            onConflict === "doNothing"
              ? insertion.onConflictDoNothing({ target: targets })
              : insertion.onConflictDoUpdate({
                  target: [
                    ar.studentId,
                    ar.classId,
                    ar.classOfferingId,
                    ar.datePh,
                  ],
                  set: { recordCount: sql`${ar.recordCount} + 1` }, //  ! increase record count on conflict
                });

          return insertion.returning();
        },
      });

      try {
        return await insert;
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_STORE_ERROR",
          message: "Failed inserting into `attendance_records` table.",
          err,
        });
      }
    }

    private async getExistingRecords(args: {
      values: {
        classId: number;
        classOfferingId: number;
        datePh: string;
        studentIds: number[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values, dbOrTx } = args;

      try {
        return await this._attendanceRecordRepo
          .execQuery({
            dbOrTx,
            fn: async (query) =>
              query.findMany({
                where: (ar, { and, eq, inArray }) =>
                  and(
                    inArray(ar.studentId, values.studentIds),
                    eq(ar.classId, values.classId),
                    eq(ar.classOfferingId, values.classOfferingId),
                    eq(ar.datePh, values.datePh),
                  ),
                columns: { studentId: true },
              }),
          })
          .then((r) => new Set(r.map((r) => r.studentId)));
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed to retrieve attendance records",
          err,
        });
      }
    }

    private async getSession(args: {
      values: { id: number };
      tx?: TxContext | undefined;
    }) {
      let session;

      try {
        session = await this._classSessionRepo
          .queryMinimalShape({
            where: (cs, { eq }) => eq(cs.id, args.values.id),
            dbOrTx: args.tx,
          })
          .then((r) => r[0]);
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Failed querying `class_sessions` table.",
          err,
        });
      }

      if (!session)
        throw new Core.Errors.EnrollmentData.ErrorClass({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message: "Could not find the specified class session.",
        });

      return session;
    }

    private async getEnrollment(args: {
      values: { studentId: number; classOfferingId: number };
      tx?: TxContext | undefined;
    }) {
      try {
        const result = await this._enrollmentRepo.execQuery({
          dbOrTx: args.tx,
          fn: async (query) =>
            query.findFirst({
              where: (e, { and, eq }) =>
                and(
                  eq(e.studentId, args.values.studentId),
                  eq(e.classOfferingId, args.values.classOfferingId),
                ),
              columns: { id: true, status: true },
            }),
        });

        if (!result)
          throw new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_QUERY_ERROR",
            message:
              "There is no enrollment corresponding to the given student id and class offering id.",
          });

        return result;
      } catch (err) {
        throw Core.Errors.EnrollmentData.normalizeError({
          name: "ENROLLMENT_DATA_QUERY_ERROR",
          message:
            "Failed to retrieve enrollment linked to student and class offering.",
          err,
        });
      }
    }

    private async updateRecords(args: {
      values: {
        classId: number;
        classOfferingId: number;
        updatedByUserId?: number | undefined;
        updatedAt: string;
        records: {
          datePh: string;
          recordedAt: string;
          recordedMs: number;
          studentId: number;
          status: keyof typeof Data.attendanceStatus;
        }[];
      };
      dbOrTx?: DbOrTx | undefined;
    }) {
      const { values } = args;
      const { attendanceRecords: ar } = Schema;
      const { and, eq } = RepositoryUtil.filters;

      const updated = [];

      for (const r of args.values.records) {
        const res = await this._attendanceRecordRepo.execUpdate({
          dbOrTx: args.dbOrTx,
          fn: async (update) =>
            update
              .set({
                recordedAt: r.recordedAt,
                recordedMs: r.recordedMs,
                status: r.status,
                updatedAt: values.updatedAt,
                updatedByUserId: values.updatedByUserId,
              })
              .where(
                and(
                  eq(ar.studentId, r.studentId),
                  eq(ar.classId, values.classId),
                  eq(ar.classOfferingId, values.classOfferingId),
                  eq(ar.datePh, r.datePh),
                ),
              )
              .returning(),
        });

        if (res.length === 0)
          throw new Core.Errors.EnrollmentData.ErrorClass({
            name: "ENROLLMENT_DATA_UPDATE_ERROR",
            message: `Attendance record with class_id: ${values.classId}, class_offering_id: ${values.classOfferingId}, and student_id: ${r.studentId} for date: ${r.datePh} not found.`,
          });

        updated.push(...res);
      }

      return updated;
    }
  }
}
