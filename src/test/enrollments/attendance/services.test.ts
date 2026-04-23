import request from "supertest";
import { app } from "../../../app";
import { AttendanceData } from "../../../features/enrollments/subfeatures/attendance/services/attendance-data.service";
import { Schemas } from "../../../features/enrollments/subfeatures/attendance/schemas";
import { Errors } from "../../../features/enrollments/core/errors";

describe("Attendance Services", () => {
  let dataService: AttendanceData.Service;
  const assertSuccess: (success: boolean) => asserts success is true = (
    success: boolean,
  ): asserts success is true => {
    if (!success) throw new Error("Expected operation to succeed.");
  };
  const assertFail: (success: boolean) => asserts success is false = (
    success: boolean,
  ): asserts success is false => {
    if (success) throw new Error("Expected operation to fail.");
  };
  const ids = {
    professor: {
      valid: 6,
      invalid: 5,
      notFound: 100,
    },
    student: {
      valid: 7,
      invalid: 8,
      notFound: 100,
    },
    class: {
      student: {
        valid: 6,
        invalid: 7,
        notFound: 100,
      },
      professor: {
        valid: 6,
        invalid: 5,
        notFound: 100,
      },
    },
    session: {
      professor: {
        valid: 157,
        invalid: 156,
        notFound: 1000,
      },
    },
    enrollment: {
      professor: {
        valid: 6,
        invalid: 11,
        notFound: 100,
      },
    },
  };

  beforeAll(async () => {
    dataService = await AttendanceData.create();
  });

  describe("Attendance Data Service", () => {
    describe("Class Attendance (Professor View)", () => {
      it("should return records", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-class",
            role: "professor",
            scope: "class",
            values: {
              classSessionId: ids.session.professor.valid,
              professorId: ids.professor.valid,
            },
          },
        });

        expect(op.success).toBe(true);

        assertSuccess(op.success);

        const parsed = Schemas.Dto.ClassAttendance.professorView.parse(
          op.result,
        );
      });

      it("should fail for forbidden (non-existent class session)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-class",
            role: "professor",
            scope: "class",
            values: {
              classSessionId: ids.session.professor.notFound,
              professorId: ids.professor.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;

        type ErrorName = Errors.EnrollmentData.ErrorName;

        const errorName: ErrorName = "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (invalid class session)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-class",
            role: "professor",
            scope: "class",
            values: {
              classSessionId: ids.session.professor.invalid,
              professorId: ids.professor.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;

        type ErrorName = Errors.EnrollmentData.ErrorName;

        const errorName: ErrorName = "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (invalid professor)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-class",
            role: "professor",
            scope: "class",
            values: {
              classSessionId: ids.session.professor.valid,
              professorId: ids.professor.invalid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;

        type ErrorName = Errors.EnrollmentData.ErrorName;

        const errorName: ErrorName = "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (non-existent professor)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-class",
            role: "professor",
            scope: "class",
            values: {
              classSessionId: ids.session.professor.valid,
              professorId: ids.professor.notFound,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;

        type ErrorName = Errors.EnrollmentData.ErrorName;

        const errorName: ErrorName = "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });
    });

    describe("Class Attendance (Student View)", () => {
      it("should return records", async () => {
        const op = await dataService.getAttendance({
          constraints: { page: 1 },
          queryContext: {
            roleScope: "student-class",
            role: "student",
            scope: "class",
            values: {
              classId: ids.class.student.valid,
              studentId: ids.student.valid,
            },
          },
        });

        expect(op.success).toBe(true);

        assertSuccess(op.success);

        const parsed = Schemas.Dto.ClassAttendance.studentView.parse(op.result);
      });

      it("should fail for forbidden (non-existent class)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "student-class",
            role: "student",
            scope: "class",
            values: {
              classId: ids.class.student.notFound,
              studentId: ids.student.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        const { error } = op;

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (non-existent student)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "student-class",
            role: "student",
            scope: "class",
            values: {
              classId: ids.class.student.valid,
              studentId: ids.student.notFound,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        const { error } = op;

        expect(error.name).toBe(errorName);
      });
    });

    describe("Student Attendance (Professor View)", () => {
      it("should return records", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.valid,
              classId: ids.class.professor.valid,
              enrollmentId: ids.enrollment.professor.valid,
            },
          },
        });

        expect(op.success).toBe(true);

        assertSuccess(op.success);

        const parsed = Schemas.Dto.StudentAttendance.professorView.parse(
          op.result,
        );
      });

      it("should fail for forbidden (non-existent class)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.valid,
              classId: ids.class.professor.notFound,
              enrollmentId: ids.enrollment.professor.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;
        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (non-existent professor)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.notFound,
              classId: ids.class.professor.valid,
              enrollmentId: ids.enrollment.professor.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;
        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (invalid class)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.valid,
              classId: ids.class.professor.invalid,
              enrollmentId: ids.enrollment.professor.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;
        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (invalid professor)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.invalid,
              classId: ids.class.professor.valid,
              enrollmentId: ids.enrollment.professor.valid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;
        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (invalid enrollment)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.valid,
              classId: ids.class.professor.valid,
              enrollmentId: ids.enrollment.professor.invalid,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;
        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });

      it("should fail for forbidden (non-existent enrollment)", async () => {
        const op = await dataService.getAttendance({
          queryContext: {
            roleScope: "professor-student",
            role: "professor",
            scope: "student",
            values: {
              professorId: ids.professor.valid,
              classId: ids.class.professor.valid,
              enrollmentId: ids.enrollment.professor.notFound,
            },
          },
        });

        expect(op.success).toBe(false);

        assertFail(op.success);

        const { error } = op;
        const errorName: Errors.EnrollmentData.ErrorName =
          "ENROLLMENT_DATA_FORBIDDEN_ERROR";

        expect(error.name).toBe(errorName);
      });
    });
  });
});
