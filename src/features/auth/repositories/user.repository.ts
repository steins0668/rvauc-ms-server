import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, TxContext } from "../../../db/create-context";
import { users } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";

export class UserRepository extends Repository<Types.Tables.Users> {
  public constructor(context: DbContext) {
    super(context, users);
  }

  /**
   * @public
   * @async
   * @description Asynchronously inserts a row into the `users` table.
   *
   * @param user - The row to be inserted.
   * @returns - The {@link user.id} if the insert operation is successful, `undefined` otherwise.
   */
  public async insertOne(args: {
    dbOrTx?: DbContext | TxContext | undefined;
    user: Types.InsertModels.User;
  }): Promise<number | undefined> {
    // const inserted = await this._insertOne({ dbOrTx, value: user });
    const { dbOrTx, user } = args;
    const inserted = await this.execInsert({
      dbOrTx,
      fn: async (insert) => {
        return await insert
          .values(user)
          .onConflictDoNothing()
          .returning()
          .then((result) => result[0]);
      },
    });
    return inserted?.id;
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.User<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(users);
    return await args.fn(insert, this.buildWhereClause);
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.User<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.users;
    return await args.fn(query, this.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.User<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(users);
    return await args.fn(update, this.buildWhereClause);
  }

  /**
   * @protected
   * @function buildWhereClause
   * @description Constructs a dynamic SQL `WHERE` clause based on the provided filter options.
   *
   * The method builds a list of conditions using the fields in the filter object.
   * If no filters are provided or all are `undefined`, the resulting clause will be `undefined`.
   *
   * @param filter An optional filter object used to determine which conditions to include.
   * @returns The composed `WHERE` SQL statement, or `undefined` if no conditions are set.
   */
  protected buildWhereClause(
    filter?: Types.Repository.QueryFilters.User
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, email, username, rfidUid } = filter;
      if (id !== undefined) {
        conditions.push(eq(users.id, id));
      }

      if (rfidUid && rfidUid.trim())
        conditions.push(eq(users.rfidUid, rfidUid));

      if (email && email.trim()) {
        conditions.push(eq(users.email, email));
      }

      if (username && username.trim()) {
        conditions.push(eq(users.username, username));
      }

      if (conditions.length > 0) {
        const whereClause =
          filterType === "or" ? or(...conditions) : and(...conditions);

        return whereClause;
      }
    }

    return undefined;
  }
}
