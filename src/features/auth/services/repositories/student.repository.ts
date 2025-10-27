import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, TxContext } from "../../../../db/create-context";
import { students } from "../../../../models";
import { Repository } from "../../../../services";
import { InsertModels, Tables, ViewModels } from "../../types";

export class StudentRepository extends Repository<Tables.Student> {
  public constructor(context: DbContext) {
    super(context, students);
  }

  /**
   * @public
   * @async
   * @function insertStudent
   * @description Asynchronously inserts a row into the `students` table.
   *
   * @param student - The new row to be inserted.
   * @returns - The id if the insert operation is successful, `undefined` otherwise.
   */
  public async insertStudent({
    dbOrTx,
    student,
  }: {
    dbOrTx?: DbContext | TxContext | undefined;
    student: InsertModels.Student;
  }): Promise<number | undefined> {
    const inserted = await this.insertOne({ dbOrTx, value: student });
    return inserted?.id;
  }
  /**
   * @public
   * @async
   * @function getStudent
   * @description Asynchronously retrieves a row from the `students` table, optionally
   * applying a filter of type `StudentFilter`.
   *
   * @param filter - The filter to apply to the table.
   * @returns - A `Promise` resolving to a viewmodel of the found row or
   * `undefined`.
   */
  public async getStudent(
    filter?: StudentFilter
  ): Promise<ViewModels.Student | undefined> {
    const whereClause = this.buildWhereClause(filter);

    return await this.getOne({ whereClause });
  }

  /**
   * @protected
   * @function buildWhereClause
   * @description Constructs a dynamic SQL `WHERE` clause based on the provided
   * filter options.
   *
   * The method builds a list of conditions using the fields in the
   * `StudentFilter` object.
   * If no filters are provided or all are `undefined`, the resulting clause
   * will be `undefined`.
   *
   * @param filter An optional `StudentFilter` object used to determine which
   * conditions to include.
   * @returns The composed `WHERE` SQL statement, or `undefined` if no
   * conditions are set.
   */
  protected buildWhereClause(filter?: StudentFilter): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType, id, departmentId, studentNumber, yearLevel, block } =
        filter;
      if (id !== undefined) conditions.push(eq(students.id, id));

      if (departmentId !== undefined)
        conditions.push(eq(students.departmentId, departmentId));

      if (studentNumber && studentNumber.trim())
        conditions.push(eq(students.studentNumber, studentNumber));

      if (yearLevel !== undefined)
        conditions.push(eq(students.yearLevel, yearLevel));

      if (block && block.trim()) conditions.push(eq(students.block, block));

      if (conditions.length > 0) {
        const whereClause =
          filterType === "or" ? or(...conditions) : and(...conditions);

        return whereClause;
      }
    }

    return undefined;
  }
}

/**
 * @interface StudentFilter
 * @description An interface for the filter used for Db queries on the `students` table.
 * Contains the following fields:
 * ### Filters:
 * - `filterType`: Option to decide whether the filter is an `or` or an `and`.
 * - `id`: Matches the student's id.
 * - `departmentId`: Matches the student's departmentId.
 * - `studentNumber`: Matches the student's studentNumber.
 * - `yearLevel`: Matches the student's yearLevel.
 * - `block`: Matches the student's block.
 */
export interface StudentFilter {
  filterType?: "and" | "or" | undefined;
  id?: number | undefined;
  departmentId?: number | undefined;
  studentNumber?: string | undefined;
  yearLevel?: number | undefined;
  block?: string | undefined;
}
