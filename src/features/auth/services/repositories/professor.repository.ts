import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, TxContext } from "../../../../db/create-context";
import { professors } from "../../../../models";
import { Repository } from "../../../../services";
import { InsertModels, Tables } from "../../types";

export type ProfessorsQueryArgs<T> = {
  dbOrTx?: DbContext | TxContext | undefined;
  fn: (
    query: DbContext["query"]["professors"],
    filterConverter: ProfessorRepository["buildWhereClause"]
  ) => Promise<T>;
};
export class ProfessorRepository extends Repository<Tables.Professors> {
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
  public async insertOne({
    dbOrTx,
    professor,
  }: {
    dbOrTx?: DbContext | TxContext | undefined;
    professor: InsertModels.Professor;
  }): Promise<number | undefined> {
    const inserted = await this._insertOne({ dbOrTx, value: professor });
    return inserted?.id;
  }

  public async execQuery<T>(args: ProfessorsQueryArgs<T>) {
    return await args.fn(this.getQuery(args.dbOrTx), this.buildWhereClause);
  }

  public getQuery(dbOrTx?: DbContext | TxContext | undefined) {
    return (dbOrTx ?? this._dbContext).query.professors;
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
  protected buildWhereClause(filter?: ProfessorFilter): SQL | undefined {
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

/**
 * @interface ProfessorFilter
 * @description An interface for the filter used for Db queries on the `students` table.
 * Contains the following fields:
 * ### Filters:
 * - `filterType`: Option to decide whether the filter is an `or` or an `and`.
 * - `id`: Matches the student's id.
 * - `collegeId`: Matches the professor's collegeId.
 * - `facultyRank`: Matches the student's facultyRank.
 */
export interface ProfessorFilter {
  filterType?: "and" | "or" | undefined;
  id?: number | undefined;
  collegeId?: number | undefined;
  facultyRank?: string | undefined;
}
