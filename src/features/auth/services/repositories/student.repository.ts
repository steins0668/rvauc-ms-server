import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, TxContext } from "../../../../db/create-context";
import { students } from "../../../../models";
import { Repository } from "../../../../services";
import { InsertModels, QueryArgs, QueryFilters, Tables } from "../../types";

export class StudentRepository extends Repository<Tables.Student> {
  public constructor(context: DbContext) {
    super(context, students);
  }

  /**
   * @public
   * @async
   * @description Asynchronously inserts a row into the `students` table.
   *
   * @param student - The new row to be inserted.
   * @returns - The id if the insert operation is successful, `undefined` otherwise.
   */
  public async insertOne({
    dbOrTx,
    student,
  }: {
    dbOrTx?: DbContext | TxContext | undefined;
    student: InsertModels.Student;
  }): Promise<number | undefined> {
    const inserted = await this._insertOne({ dbOrTx, value: student });
    return inserted?.id;
  }

  public async execQuery<T>(args: QueryArgs.Student<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.students;
    return await args.fn(query, this.buildWhereClause);
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
  protected buildWhereClause(filter?: QueryFilters.Student): SQL | undefined {
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
