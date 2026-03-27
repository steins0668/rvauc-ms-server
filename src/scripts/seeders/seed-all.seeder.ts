import bcrypt from "bcrypt";
import {
  createContext,
  DbOrTx,
  execTransaction,
} from "../../db/create-context";
import { Auth } from "../../features/auth";
import { Enrollments } from "../../features/enrollments";

export const colleges = [
  { id: 1, name: "College of Arts and Science" },
  { id: 2, name: "College of Business and Arts" },
  { id: 3, name: "College of Computing Science" },
  { id: 4, name: "College of Education" },
];

export const seedColleges = async (dbOrTx?: DbOrTx | undefined) => {
  const repo = new Enrollments.Repositories.College(await createContext());

  return await repo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(colleges).returning(),
  });
};

export const departments = [
  { id: 1, collegeId: 3, name: "Department Of Computer Science" },
  { id: 2, collegeId: 3, name: "Department Of Information Technology" },
];

export const seedDepartments = async (dbOrTx?: DbOrTx | undefined) => {
  const repo = new Enrollments.Repositories.Department(await createContext());

  return await repo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(departments).returning(),
  });
};

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

export const seedRooms = async (dbOrTx?: DbOrTx | undefined) => {
  const repo = new Enrollments.Repositories.Room(await createContext());

  return await repo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(rooms).returning(),
  });
};

export const roles = [
  { id: 0, name: "student" },
  { id: 1, name: "professor" },
];

export const seedRoles = async (dbOrTx?: DbOrTx | undefined) => {
  const roleRepo = new Auth.Repositories.Role(await createContext());

  return await roleRepo.execInsert({
    dbOrTx,
    fn: async (insert) => insert.values(roles).returning(),
  });
};

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

export const seedProfessors = async (dbOrTx?: DbOrTx | undefined) => {
  const userRepo = new Auth.Repositories.User(await createContext());
  const profRepo = new Auth.Repositories.Professor(await createContext());

  const hashedUsersProfessors = await Promise.all(
    usersProfessors.map(async (value) => {
      value.passwordHash = await bcrypt.hash(value.passwordHash, 10);
      return value;
    }),
  );

  await userRepo.execInsert({
    dbOrTx,
    fn: async (insert) => insert.values(hashedUsersProfessors).returning(),
  });

  await profRepo.execInsert({
    dbOrTx,
    fn: async (insert) => insert.values(professors).returning(),
  });
};

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

export const seedStudents = async (dbOrTx?: DbOrTx | undefined) => {
  const userRepo = new Auth.Repositories.User(await createContext());
  const studentRepo = new Auth.Repositories.Student(await createContext());

  const hashedUsersStudents = await Promise.all(
    usersStudents.map(async (value) => {
      value.passwordHash = await bcrypt.hash(value.passwordHash, 10);
      return value;
    }),
  );

  await userRepo.execInsert({
    dbOrTx,
    fn: async (insert) => insert.values(hashedUsersStudents).returning(),
  });

  await studentRepo.execInsert({
    dbOrTx,
    fn: async (insert) => insert.values(students).returning(),
  });
};

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

export const seedCourses = async (dbOrTx?: DbOrTx | undefined) => {
  const courseRepo = new Enrollments.Repositories.Course(await createContext());

  return await courseRepo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(courses).returning(),
  });
};

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

export const seedClasses = async (dbOrTx?: DbOrTx | undefined) => {
  const classRepo = new Enrollments.Repositories.Class(await createContext());

  return await classRepo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(classes).returning(),
  });
};

export const classOfferings = [
  {
    id: 1,
    classId: 1,
    classNumber: "525",
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
    classNumber: "522",
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
    classNumber: "524",
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
    classNumber: "520",
    weekDay: "tue",
    roomId: 4,
    startTime: 32400,
    endTime: 39600,
    startTimeText: "9:00 AM",
    endTimeText: "11:00 AM",
  },
  {
    id: 5,
    classId: 5,
    classNumber: "523",
    weekDay: "tue",
    roomId: 5,
    startTime: 46800,
    endTime: 54000,
    startTimeText: "1:00 PM",
    endTimeText: "3:00 PM",
  },
  {
    id: 6,
    classId: 2,
    classNumber: "522",
    weekDay: "tue",
    roomId: 6,
    startTime: 54000,
    endTime: 61200,
    startTimeText: "3:00 PM",
    endTimeText: "5:00 PM",
  },
  {
    id: 7,
    classId: 6,
    classNumber: "512",
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
    classNumber: "523",
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
    classNumber: "522",
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
    classNumber: "525",
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
    classNumber: "524",
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
    classNumber: "520",
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
    classNumber: "512",
    weekDay: "thu",
    roomId: 4,
    startTime: 36000,
    endTime: 43200,
    startTimeText: "10:00 AM",
    endTimeText: "12:00 PM",
  },
  {
    id: 14,
    classId: 1,
    classNumber: "525",
    weekDay: "thu",
    roomId: 5,
    startTime: 46800,
    endTime: 54000,
    startTimeText: "1:00 PM",
    endTimeText: "3:00 PM",
  },
  {
    id: 15,
    classId: 5,
    classNumber: "523",
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
    classNumber: "520",
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
    classNumber: "512",
    weekDay: "fri",
    roomId: 8,
    startTime: 46800,
    endTime: 54000,
    startTimeText: "1:00 PM",
    endTimeText: "3:00 PM",
  },
];

export const seedClassOfferings = async (dbOrTx: DbOrTx | undefined) => {
  const offeringRepo = new Enrollments.Repositories.ClassOffering(
    await createContext(),
  );

  return await offeringRepo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(classOfferings).returning(),
  });
};

export const seedTerms = async (dbOrTx?: DbOrTx | undefined) => {
  const termRepo = new Enrollments.Repositories.Term(await createContext());

  return await termRepo.execInsert({
    dbOrTx,
    fn: async ({ insert }) =>
      insert
        .values({ id: 1, yearStart: 2025, yearEnd: 2026, semester: 1 })
        .returning(),
  });
};

export const enrollments = [
  // Student 7 (Lee Archelaus Agaton)
  { id: 1, studentId: 7, classOfferingId: 1, termId: 1, status: "enrolled" },
  { id: 2, studentId: 7, classOfferingId: 2, termId: 1, status: "enrolled" },
  { id: 3, studentId: 7, classOfferingId: 3, termId: 1, status: "enrolled" },
  { id: 4, studentId: 7, classOfferingId: 4, termId: 1, status: "enrolled" },
  { id: 5, studentId: 7, classOfferingId: 5, termId: 1, status: "enrolled" },
  { id: 6, studentId: 7, classOfferingId: 6, termId: 1, status: "enrolled" },
  { id: 7, studentId: 7, classOfferingId: 7, termId: 1, status: "enrolled" },
  { id: 8, studentId: 7, classOfferingId: 8, termId: 1, status: "enrolled" },
  { id: 9, studentId: 7, classOfferingId: 9, termId: 1, status: "enrolled" },
  { id: 10, studentId: 7, classOfferingId: 10, termId: 1, status: "enrolled" },
  { id: 11, studentId: 7, classOfferingId: 11, termId: 1, status: "enrolled" },
  { id: 12, studentId: 7, classOfferingId: 12, termId: 1, status: "enrolled" },
  { id: 13, studentId: 7, classOfferingId: 13, termId: 1, status: "enrolled" },
  { id: 14, studentId: 7, classOfferingId: 14, termId: 1, status: "enrolled" },
  { id: 15, studentId: 7, classOfferingId: 15, termId: 1, status: "enrolled" },
  { id: 16, studentId: 7, classOfferingId: 16, termId: 1, status: "enrolled" },
  { id: 17, studentId: 7, classOfferingId: 17, termId: 1, status: "enrolled" },

  // Student 8 (Daina Joy Parducho)
  { id: 18, studentId: 8, classOfferingId: 1, termId: 1, status: "enrolled" },
  { id: 19, studentId: 8, classOfferingId: 2, termId: 1, status: "enrolled" },
  { id: 20, studentId: 8, classOfferingId: 3, termId: 1, status: "enrolled" },
  { id: 21, studentId: 8, classOfferingId: 4, termId: 1, status: "enrolled" },
  { id: 22, studentId: 8, classOfferingId: 5, termId: 1, status: "enrolled" },
  { id: 23, studentId: 8, classOfferingId: 6, termId: 1, status: "enrolled" },
  { id: 24, studentId: 8, classOfferingId: 7, termId: 1, status: "enrolled" },
  { id: 25, studentId: 8, classOfferingId: 8, termId: 1, status: "enrolled" },
  { id: 26, studentId: 8, classOfferingId: 9, termId: 1, status: "enrolled" },
  { id: 27, studentId: 8, classOfferingId: 10, termId: 1, status: "enrolled" },
  { id: 28, studentId: 8, classOfferingId: 11, termId: 1, status: "enrolled" },
  { id: 29, studentId: 8, classOfferingId: 12, termId: 1, status: "enrolled" },
  { id: 30, studentId: 8, classOfferingId: 13, termId: 1, status: "enrolled" },
  { id: 31, studentId: 8, classOfferingId: 14, termId: 1, status: "enrolled" },
  { id: 32, studentId: 8, classOfferingId: 15, termId: 1, status: "enrolled" },
  { id: 33, studentId: 8, classOfferingId: 16, termId: 1, status: "enrolled" },
  { id: 34, studentId: 8, classOfferingId: 17, termId: 1, status: "enrolled" },

  // Student 9 (Julius Trinidad)
  { id: 35, studentId: 9, classOfferingId: 1, termId: 1, status: "enrolled" },
  { id: 36, studentId: 9, classOfferingId: 2, termId: 1, status: "enrolled" },
  { id: 37, studentId: 9, classOfferingId: 3, termId: 1, status: "enrolled" },
  { id: 38, studentId: 9, classOfferingId: 4, termId: 1, status: "enrolled" },
  { id: 39, studentId: 9, classOfferingId: 5, termId: 1, status: "enrolled" },
  { id: 40, studentId: 9, classOfferingId: 6, termId: 1, status: "enrolled" },
  { id: 41, studentId: 9, classOfferingId: 7, termId: 1, status: "enrolled" },
  { id: 42, studentId: 9, classOfferingId: 8, termId: 1, status: "enrolled" },
  { id: 43, studentId: 9, classOfferingId: 9, termId: 1, status: "enrolled" },
  { id: 44, studentId: 9, classOfferingId: 10, termId: 1, status: "enrolled" },
  { id: 45, studentId: 9, classOfferingId: 11, termId: 1, status: "enrolled" },
  { id: 46, studentId: 9, classOfferingId: 12, termId: 1, status: "enrolled" },
  { id: 47, studentId: 9, classOfferingId: 13, termId: 1, status: "enrolled" },
  { id: 48, studentId: 9, classOfferingId: 14, termId: 1, status: "enrolled" },
  { id: 49, studentId: 9, classOfferingId: 15, termId: 1, status: "enrolled" },
  { id: 50, studentId: 9, classOfferingId: 16, termId: 1, status: "enrolled" },
  { id: 51, studentId: 9, classOfferingId: 17, termId: 1, status: "enrolled" },
];

export const seedEnrollments = async (dbOrTx?: DbOrTx | undefined) => {
  const enrollmentRepo = new Enrollments.Repositories.Enrollment(
    await createContext(),
  );

  return await enrollmentRepo.execInsert({
    dbOrTx,
    fn: async ({ insert }) => insert.values(enrollments),
  });
};

export const seedDatabase = async () => {
  await execTransaction(async (tx) => {
    await seedColleges(tx);
    await seedDepartments(tx);
    await seedRooms(tx);
    await seedRoles(tx);
    await seedProfessors(tx);
    await seedStudents(tx);
    await seedCourses(tx);
    await seedClasses(tx);
    await seedClassOfferings(tx);
    await seedTerms(tx);
    await seedEnrollments(tx);
  });
};

seedDatabase();
