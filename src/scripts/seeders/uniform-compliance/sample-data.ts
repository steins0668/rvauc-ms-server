import { randomInt } from "crypto";
import { DbOrTx } from "../../../db/create-context";
import { TimeUtil } from "../../../utils";
import { SampleData as Enrollments } from "../enrollments/sample-data";
import { SampleData as Auth } from "../auth/sample-data";

export namespace SampleData {
  export const uniformTypes = [
    {
      id: 1,
      name: "Type A Male",
    },
    {
      id: 2,
      name: "Type A Female",
    },
    {
      id: 3,
      departmentId: Enrollments.departments[0]?.id,
      name: "Department Shirt",
    },
    {
      id: 4,
      departmentId: Enrollments.departments[1]?.id,
      name: "Department Shirt",
    },
  ];

  const pickCompliance = () => {
    const r = Math.random();
    if (r < 0.65) return true;
    return false;
  };

  const pickComplianceFlags = (isCompliant: boolean) => {
    const elements = {
      validFootwear: true,
      hasId: true,
      validUpperwear: true,
      validBottoms: true,
    };

    if (isCompliant) return { elements, reasons: [] };

    const r = Math.random();

    if (r < 0.4)
      return {
        elements: { ...elements, hasId: false },
        reasons: ["no id"],
      };
    if (r < 0.6)
      return {
        elements: { ...elements, validFootwear: false },
        reasons: ["incorrect footwear"],
      };
    if (r < 0.8)
      return {
        elements: { ...elements, validUpperwear: false },
        reasons: ["incorrect upperwear"],
      };
    if (r < 0.95)
      return {
        elements: { ...elements, hasId: false, validFootwear: false },
        reasons: ["no id", "incorrect footwear"],
      };
    return {
      elements: { ...elements, hasId: false, validUpperwear: false },
      reasons: ["no id", "incorrect upperwear"],
    };
  };

  const generateRecordedDate = (args: {
    date: Date;
    startTime: number;
    endTime: number;
  }) => {
    //  10 mins before -> 10 mins after start
    const offset = randomInt(-1800, -600);
    const timeRange = TimeUtil.getPhTimeRange(
      args.date,
      args.startTime,
      args.endTime,
    );

    return new Date(timeRange.startTimeMs + offset * 1000);
  };

  export const generateComplianceAndViolationRecords = async (args: {
    startDate: string;
    endDate: string;
  }) => {
    const complianceRecords = [];
    const violationRecords = [];
    let complianceId = 1;
    let violationId = 1;

    const current = new Date(args.startDate);
    const end = new Date(args.endDate);

    while (current <= end) {
      const datePh = TimeUtil.toPhDate(current);
      const weekDay = TimeUtil.toPhDay(current);

      const offeringsToday = Enrollments.classOfferings.filter(
        (e) => e.weekDay === weekDay && e.roomId !== undefined,
      );

      const recordedEnrollees = new Set<number>();

      for (const o of offeringsToday) {
        const enrollees = Enrollments.enrollments.filter(
          (e) => e.classId === o.classId,
        );

        for (const e of enrollees) {
          if (recordedEnrollees.has(e.studentId)) continue;

          const student = {
            ...Auth.usersStudents.find((us) => us.id === e.studentId),
            ...Auth.students.find((u) => u.id === e.studentId),
          };

          const isCompliant = pickCompliance();

          let uniformType;

          if (weekDay === "fri")
            uniformType =
              student.departmentId !== undefined
                ? uniformTypes.find(
                    (ut) => ut.departmentId === student.departmentId,
                  )
                : student.gender === "male"
                  ? uniformTypes.at(0)
                  : uniformTypes.at(1);
          else
            uniformType =
              student.gender === "male"
                ? uniformTypes.at(0)
                : uniformTypes.at(1);

          if (uniformType === undefined)
            throw new Error("Expected a uniform type.");

          const recordedDate = generateRecordedDate({
            date: current,
            startTime: o.startTime,
            endTime: o.endTime,
          });

          const iso = recordedDate.toISOString();
          const recordedMs = recordedDate.getTime();

          const complianceFlags = pickComplianceFlags(isCompliant);

          complianceRecords.push({
            id: isCompliant ? complianceId++ : complianceId,
            studentId: e.studentId,
            uniformTypeId: uniformType.id,
            termId: 1,
            createdAt: iso,
            recordCount: 1,
            recordedAt: iso,
            recordedMs,
            updatedAt: iso,
            datePh,
            ...complianceFlags.elements,
          });

          if (!isCompliant)
            violationRecords.push({
              id: violationId++,
              studentId: e.studentId,
              statusId: 0,
              date: iso,
              reasons: complianceFlags.reasons,
              complianceRecordId: complianceId++,
            });

          recordedEnrollees.add(e.studentId);
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return { complianceRecords, violationRecords };
  };
}
