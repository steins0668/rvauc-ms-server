import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, TxContext } from "../../../db/create-context";
import { professors } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class ProfessorRepository extends Repository<Types.Tables.Professors> {
  public constructor(context: DbContext) {
    super(context, professors);
  }

  /**
   * @public
   * @async
   * @function insertOne
   * @description Asynchronously inserts a row into the `professors` table.
   *
   * @param professor - The new row to be inserted.
   * @returns - The id if the insert operation is successful, `undefined` otherwise.
   */
  public async insertOne(args: {
    dbOrTx?: DbContext | TxContext | undefined;
    professor: Types.InsertModels.Professor;
  }): Promise<number | undefined> {
    const { dbOrTx, professor } = args;
    // const inserted = await this._insertOne({ dbOrTx, value: professor });
    const inserted = await this.execInsert({
      dbOrTx,
      fn: async (insert, converter) => {
        return await insert
          .values(professor)
          .onConflictDoNothing()
          .returning()
          .then((result) => result[0]);
      },
    });
    return inserted?.id;
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Professor<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(professors);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Professor<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.professors;
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
    filter?: Types.Repository.QueryFilters.Professor
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType, id, collegeId, facultyRank } = filter;
      if (id !== undefined) conditions.push(eq(professors.id, id));

      if (collegeId !== undefined)
        conditions.push(eq(professors.collegeId, collegeId));

      if (facultyRank && facultyRank.trim())
        conditions.push(eq(professors.facultyRank, facultyRank));

      if (conditions.length > 0) {
        const whereClause =
          filterType === "or" ? or(...conditions) : and(...conditions);

        return whereClause;
      }
    }

    return undefined;
  }
}
