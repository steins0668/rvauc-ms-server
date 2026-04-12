import { SampleData as Enrollments } from "../enrollments/sample-data";

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
}
