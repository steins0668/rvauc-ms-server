export namespace SampleData {
  export const roles = [
    { id: 0, name: "student" },
    { id: 1, name: "professor" },
  ];

  export const usersProfessors = [
    {
      id: 1,
      roleId: 1,
      email: "jolymar.ropal@lu.edu.ph",
      username: "JolymarR1",
      passwordHash: "Password1!",
      surname: "Ropal",
      firstName: "Jolymar",
      gender: "male",
      contactNumber: "09171234501",
    },
    {
      id: 2,
      roleId: 1,
      email: "kurt.sanjose@lu.edu.ph",
      username: "KurtSJ2",
      passwordHash: "Password2!",
      surname: "San Jose",
      firstName: "Kurt",
      gender: "male",
      contactNumber: "09171234502",
    },
    {
      id: 3,
      roleId: 1,
      email: "juvie.leron@lu.edu.ph",
      username: "JuvieL3",
      passwordHash: "Password3!",
      surname: "Leron",
      firstName: "Juvie",
      gender: "female",
      contactNumber: "09171234503",
    },
    {
      id: 4,
      roleId: 1,
      email: "eden.bergonio@lu.edu.ph",
      username: "EdenB4",
      passwordHash: "Password4!",
      surname: "Bergonio",
      firstName: "Eden",
      gender: "female",
      contactNumber: "09171234504",
    },
    {
      id: 5,
      roleId: 1,
      email: "joville.avila@lu.edu.ph",
      username: "JovilleA5",
      passwordHash: "Password5!",
      surname: "Avila",
      firstName: "Joville",
      gender: "female",
      contactNumber: "09171234505",
    },
    {
      id: 6,
      roleId: 1,
      email: "bea.belarmino@lu.edu.ph",
      username: "BeaBela6",
      passwordHash: "Password6!",
      surname: "Belarmino",
      firstName: "Bea",
      gender: "female",
      contactNumber: "09171234506",
    },
  ];

  export const professors = [
    {
      id: 1,
      collegeId: 3,
      facultyRank: "professor",
    },
    {
      id: 2,
      collegeId: 3,
      facultyRank: "professor",
    },
    {
      id: 3,
      collegeId: 3,
      facultyRank: "professor",
    },
    {
      id: 4,
      collegeId: 3,
      facultyRank: "professor",
    },
    {
      id: 5,
      collegeId: 3,
      facultyRank: "professor",
    },
    {
      id: 6,
      collegeId: 3,
      facultyRank: "professor",
    },
  ];

  export const usersStudents = [
    {
      id: 7,
      roleId: 0,
      email: "lee.agaton@gmail.com",
      username: "LeeA7",
      passwordHash: "Password7!",
      surname: "Agaton",
      firstName: "Lee Archelaus",
      gender: "male",
      contactNumber: "09171234507",
    },
    {
      id: 8,
      roleId: 0,
      email: "daina.parducho@gmail.com",
      username: "DainaP8",
      passwordHash: "Password8!",
      surname: "Parducho",
      firstName: "Daina Joy",
      gender: "male",
      contactNumber: "09171234508",
    },
    {
      id: 9,
      roleId: 0,
      email: "julius.trinidad@gmail.com",
      username: "JuliusT9",
      passwordHash: "Password9!",
      surname: "Trinidad",
      firstName: "Julius",
      gender: "male",
      contactNumber: "09171234509",
    },
  ];

  export const students = [
    {
      id: 7,
      departmentId: 1,
      studentNumber: "101-0001",
      yearLevel: 3,
      block: "A",
    },
    {
      id: 8,
      departmentId: 1,
      studentNumber: "102-0002",
      yearLevel: 3,
      block: "A",
    },
    {
      id: 9,
      departmentId: 1,
      studentNumber: "103-0003",
      yearLevel: 3,
      block: "A",
    },
  ];
}
