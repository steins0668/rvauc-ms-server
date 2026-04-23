import { Enrollments } from "../../../features/enrollments";
import { Types } from "../../../features/enrollments/types";
import { Clock, TimeUtil } from "../../../utils";

export namespace SampleData {
  export const colleges = [
    { id: 1, name: "College of Arts and Science" },
    { id: 2, name: "College of Business and Arts" },
    { id: 3, name: "College of Computing Science" },
    { id: 4, name: "College of Education" },
  ];

  export const departments = [
    { id: 1, collegeId: 3, name: "Department Of Computer Science" },
    { id: 2, collegeId: 3, name: "Department Of Information Technology" },
  ];

  export const courses = [
    {
      id: 1,
      code: "DS-3101",
      name: "Data Mining and Data Warehousing",
      units: 3,
    },
    {
      id: 2,
      code: "CC-3105",
      name: "Applications Development and Emerging Technologies",
      units: 3,
    },
    {
      id: 3,
      code: "CS-3112",
      name: "Automata Theory and Formal Languages",
      units: 3,
    },
    {
      id: 4,
      code: "CS-3113",
      name: "Architecture and Organization",
      units: 3,
    },
    {
      id: 5,
      code: "CS-3114",
      name: "Software Engineering 1",
      units: 3,
    },
    {
      id: 6,
      code: "CS-3115",
      name: "Information Assurance and Security",
      units: 3,
    },
  ];

  export const classes = [
    {
      id: 1,
      professorId: 1, // Ropal
      courseId: 1, // DS-3101
      termId: 1,
      classNumber: "525",
    },
    {
      id: 2,
      professorId: 2, // San Jose
      courseId: 4, // CS-3113
      termId: 1,
      classNumber: "522",
    },
    {
      id: 3,
      professorId: 3, // Leron
      courseId: 6, // CS-3115
      termId: 1,
      classNumber: "524",
    },
    {
      id: 4,
      professorId: 4, // Bergonio
      courseId: 2, // CC-3105
      termId: 1,
      classNumber: "520",
    },
    {
      id: 5,
      professorId: 5, // Avila
      courseId: 5, // CS-3114
      termId: 1,
      classNumber: "523",
    },
    {
      id: 6,
      professorId: 6, // Belarmino
      courseId: 3, // CS-3112
      termId: 1,
      classNumber: "512",
    },
  ];

  export const rooms = [
    { id: 1, name: "406", building: "Athletes' Village" },
    { id: 2, name: "407", building: "Athletes' Village" },
    { id: 3, name: "408", building: "Athletes' Village" },
    { id: 4, name: "409", building: "Athletes' Village" },
    { id: 5, name: "306", building: "Athletes' Village" },
    { id: 6, name: "307", building: "Athletes' Village" },
    { id: 7, name: "308", building: "Athletes' Village" },
    { id: 8, name: "309", building: "Athletes' Village" },
  ];

  export const classOfferings: Types.ViewModels.ClassOffering[] = [
    {
      id: 1,
      classId: 1,
      weekDay: "mon",
      roomId: 1,
      startTime: 32400,
      endTime: 39600,
      startTimeText: "9:00 AM",
      endTimeText: "11:00 AM",
    },
    {
      id: 2,
      classId: 2,
      weekDay: "mon",
      roomId: 2,
      startTime: 46800,
      endTime: 54000,
      startTimeText: "1:00 PM",
      endTimeText: "3:00 PM",
    },
    {
      id: 3,
      classId: 3,
      weekDay: "mon",
      roomId: 3,
      startTime: 54000,
      endTime: 61200,
      startTimeText: "3:00 PM",
      endTimeText: "5:00 PM",
    },
    {
      id: 4,
      classId: 4,
      weekDay: "tue",
      roomId: null,
      startTime: 32400,
      endTime: 39600,
      startTimeText: "9:00 AM",
      endTimeText: "11:00 AM",
    },
    {
      id: 5,
      classId: 5,
      weekDay: "tue",
      roomId: null,
      startTime: 46800,
      endTime: 54000,
      startTimeText: "1:00 PM",
      endTimeText: "3:00 PM",
    },
    {
      id: 6,
      classId: 2,
      weekDay: "tue",
      roomId: null,
      startTime: 54000,
      endTime: 61200,
      startTimeText: "3:00 PM",
      endTimeText: "5:00 PM",
    },
    {
      id: 7,
      classId: 6,
      weekDay: "wed",
      roomId: 7,
      startTime: 25200,
      endTime: 28800,
      startTimeText: "7:00 AM",
      endTimeText: "8:00 AM",
    },
    {
      id: 8,
      classId: 5,
      weekDay: "wed",
      roomId: 8,
      startTime: 28800,
      endTime: 32400,
      startTimeText: "8:00 AM",
      endTimeText: "9:00 AM",
    },
    {
      id: 9,
      classId: 2,
      weekDay: "wed",
      roomId: 8,
      startTime: 39600,
      endTime: 43200,
      startTimeText: "11:00 AM",
      endTimeText: "12:00 PM",
    },
    {
      id: 10,
      classId: 1,
      weekDay: "wed",
      roomId: 1,
      startTime: 46800,
      endTime: 50400,
      startTimeText: "1:00 PM",
      endTimeText: "2:00 PM",
    },
    {
      id: 11,
      classId: 3,
      weekDay: "wed",
      roomId: 2,
      startTime: 54000,
      endTime: 57600,
      startTimeText: "3:00 PM",
      endTimeText: "4:00 PM",
    },
    {
      id: 12,
      classId: 4,
      weekDay: "wed",
      roomId: 3,
      startTime: 57600,
      endTime: 61200,
      startTimeText: "4:00 PM",
      endTimeText: "5:00 PM",
    },
    {
      id: 13,
      classId: 6,
      weekDay: "thu",
      roomId: null,
      startTime: 36000,
      endTime: 43200,
      startTimeText: "10:00 AM",
      endTimeText: "12:00 PM",
    },
    {
      id: 14,
      classId: 1,
      weekDay: "thu",
      roomId: null,
      startTime: 46800,
      endTime: 54000,
      startTimeText: "1:00 PM",
      endTimeText: "3:00 PM",
    },
    {
      id: 15,
      classId: 5,
      weekDay: "fri",
      roomId: 6,
      startTime: 28800,
      endTime: 36000,
      startTimeText: "8:00 AM",
      endTimeText: "10:00 AM",
    },
    {
      id: 16,
      classId: 4,
      weekDay: "fri",
      roomId: 7,
      startTime: 36000,
      endTime: 43200,
      startTimeText: "10:00 AM",
      endTimeText: "12:00 PM",
    },
    {
      id: 17,
      classId: 6,
      weekDay: "fri",
      roomId: 8,
      startTime: 46800,
      endTime: 54000,
      startTimeText: "1:00 PM",
      endTimeText: "3:00 PM",
    },
  ];

  export const generateClassSessions = (args: {
    classOfferings: Enrollments.Types.ViewModels.ClassOffering[];
    startDate: string;
    endDate: string;
  }) => {
    const { classOfferings, startDate, endDate } = args;
    const sessions: Enrollments.Types.ViewModels.ClassSession[] = [];
    let id = 1;

    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const weekDay = TimeUtil.toPhDay(current);
      const datePh = TimeUtil.toPhDate(current);
      const nowISO = Clock.now().toISOString();
      //    get all offerings in current day
      const offerings = classOfferings.filter((co) => co.weekDay === weekDay);

      for (const o of offerings) {
        const { startTimeMs, endTimeMs } = TimeUtil.getPhTimeRange(
          current,
          o.startTime,
          o.endTime,
        );

        sessions.push({
          id: id++,
          classId: o.classId,
          classOfferingId: o.id,
          datePh,
          startTimeMs,
          endTimeMs,
          createdAt: nowISO,
          updatedAt: nowISO,
          status: Enrollments.Core.Data.enrollmentStatus.enrolled,
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return sessions;
  };

  export const enrollments = [
    // Student 7 (Lee Archelaus Agaton)
    { id: 1, studentId: 7, classId: 1, termId: 1, status: "enrolled" },
    { id: 2, studentId: 7, classId: 2, termId: 1, status: "enrolled" },
    { id: 3, studentId: 7, classId: 3, termId: 1, status: "enrolled" },
    { id: 4, studentId: 7, classId: 4, termId: 1, status: "enrolled" },
    { id: 5, studentId: 7, classId: 5, termId: 1, status: "enrolled" },
    { id: 6, studentId: 7, classId: 6, termId: 1, status: "enrolled" },

    // Student 8 (Daina Joy Parducho)
    { id: 7, studentId: 8, classId: 1, termId: 1, status: "enrolled" },
    { id: 8, studentId: 8, classId: 2, termId: 1, status: "enrolled" },
    { id: 9, studentId: 8, classId: 3, termId: 1, status: "enrolled" },
    { id: 10, studentId: 8, classId: 4, termId: 1, status: "enrolled" },
    { id: 11, studentId: 8, classId: 5, termId: 1, status: "enrolled" },
    { id: 12, studentId: 8, classId: 6, termId: 1, status: "enrolled" },

    // Student 9 (Julius Trinidad)
    { id: 13, studentId: 9, classId: 1, termId: 1, status: "enrolled" },
    { id: 14, studentId: 9, classId: 2, termId: 1, status: "enrolled" },
    { id: 15, studentId: 9, classId: 3, termId: 1, status: "enrolled" },
    { id: 16, studentId: 9, classId: 4, termId: 1, status: "enrolled" },
    { id: 17, studentId: 9, classId: 5, termId: 1, status: "enrolled" },
    { id: 18, studentId: 9, classId: 6, termId: 1, status: "enrolled" },
  ];
}
