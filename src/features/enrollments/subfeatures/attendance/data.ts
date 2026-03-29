export namespace Data {
  export namespace AttendanceQuery {
    export const roleScope = {
      studentClass: "student-class",
      professorClass: "professor-class",
      professorStudent: "professor-student",
    } as const;

    export const scope = {
      student: "student",
      class: "class",
      employee: "employee",
      employees: "employees",
    } as const;
  }

  export const attendanceStatus = {
    present: "present",
    late: "late",
    absent: "absent",
    excused: "excused",
  } as const;
}
