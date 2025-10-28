import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext, TxContext } from "../../../../db/create-context";
import { users } from "../../../../models";
import { Repository } from "../../../../services";
import { InsertModels, Tables, ViewModels } from "../../types";

type NewUser = InsertModels.User;
type UserViewModel = ViewModels.User;

export type UsersQueryArgs<T> = {
  dbOrTx?: DbContext | TxContext | undefined;
  fn: (
    query: DbContext["query"]["users"],
    filterConverter: UserRepository["buildWhereClause"]
  ) => Promise<T>;
};

export class UserRepository extends Repository<Tables.Users> {
  public constructor(context: DbContext) {
    super(context, users);
  }

  /**
   * @public
   * @async
   * @description Asynchronously inserts a row into the `users` table.
   *
   * @param user - The {@link NewUser} object to be inserted.
   * @returns - The {@link user.id} if the insert operation is successful, `undefined` otherwise.
   */
  public async insertOne({
    dbOrTx,
    user,
  }: {
    dbOrTx?: DbContext | TxContext | undefined;
    user: InsertModels.User;
  }): Promise<number | undefined> {
    const inserted = await this._insertOne({ dbOrTx, value: user });
    return inserted?.id;
  }

  public async execQuery<T>(args: UsersQueryArgs<T>) {
    return await args.fn(this.getQuery(args.dbOrTx), this.buildWhereClause);
  }

  public getQuery(dbOrTx?: DbContext | TxContext | undefined) {
    return (dbOrTx ?? this._dbContext).query.users;
  }

  /**
   * @protected
   * @function buildWhereClause
   * @description Constructs a dynamic SQL `WHERE` clause based on the provided filter options.
   *
   * The method builds a list of conditions using the fields in the {@link IUserFilter} object.
   * If no filters are provided or all are `undefined`, the resulting clause will be `undefined`.
   *
   * @param filter An optional {@link IUserFilter} object used to determine which conditions to include.
   * @returns The composed `WHERE` SQL statement, or `undefined` if no conditions are set.
   */
  protected buildWhereClause(filter?: IUserFilter): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", userId, email, username } = filter;
      if (userId !== undefined) {
        conditions.push(eq(users.id, userId));
      }

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

/**
 * @interface IUserFilter
 * @description An interface for the filter used for Db queries on the {@link users} table.
 * Contains the following fields:
 * ### Filters:
 * - {@link filterType}: Option to decide whether the filter is an `or` or an `and`.
 * - {@link userId}: Matches the user's userId.
 * - {@link email}: Matches the user's email.
 * - {@link username}: Matches the user's username.
 */
export interface IUserFilter {
  filterType?: "and" | "or";
  userId?: number;
  email?: string;
  username?: string;
}
