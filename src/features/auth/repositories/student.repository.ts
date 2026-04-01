import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, DbOrTx, TxContext } from "../../../db/create-context";
import { students } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { Types } from "../types";

export class StudentRepository extends Repository<Types.Tables.Student> {
  public constructor(context: DbContext) {
    super(context, students);
  }

  public async queryWithUserAndDepartment(args: {
    constraints?: BaseRepositoryType.QueryConstraints;
    where?:
      | NonNullable<
          Parameters<DbContext["query"]["students"]["findMany"]>[0]
        >["where"]
      | undefined;
    orderBy?:
      | NonNullable<
          Parameters<DbContext["query"]["students"]["findMany"]>[0]
        >["orderBy"]
      | undefined;
    dbOrTx?: DbOrTx | undefined;
  }) {
    const { where, orderBy, dbOrTx } = args;
    const { limit = 6, offset = undefined } = args.constraints ?? {};

    return await (dbOrTx ?? this._dbContext).query.students.findMany({
      where,
      orderBy,
      limit,
      offset,
      columns: { studentNumber: true, yearLevel: true, block: true },
      with: {
        user: {
          columns: {
            surname: true,
            firstName: true,
            middleName: true,
            gender: true,
          },
        },
        department: {
          columns: { name: true },
          with: { college: { columns: { name: true } } },
        },
      },
    });
  }

  /**
   * @public
   * @async
   * @description Asynchronously inserts a row into the `students` table.
   *
   * @param student - The new row to be inserted.
   * @returns - The id if the insert operation is successful, `undefined` otherwise.
   */
  public async insertOne(args: {
    dbOrTx?: DbContext | TxContext | undefined;
    student: Types.InsertModels.Student;
  }): Promise<number | undefined> {
    const { dbOrTx, student } = args;
    const inserted = await this.execInsert({
      dbOrTx,
      fn: async (insert) => {
        return await insert
          .values(student)
          .onConflictDoNothing()
          .returning()
          .then((result) => result[0]);
      },
    });
    return inserted?.id;
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Student<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(students);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Student<T>) {
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
  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.Student,
  ): SQL | undefined {
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
