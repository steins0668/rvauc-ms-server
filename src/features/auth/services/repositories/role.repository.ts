import { and, eq, or, SQL } from "drizzle-orm";
import type { DbContext } from "../../../../db/create-context";
import { roles } from "../../../../models";
import { Repository } from "../../../../services";
import { InsertModels, RepositoryTypes, Tables, ViewModels } from "../../types";

type NewRole = InsertModels.Role;
type RoleViewModel = ViewModels.Role;
type RoleFilter =
  | {
      searchBy: "id";
      id: number;
    }
  | {
      searchBy: "name";
      name: string;
    };

export class RoleRepository extends Repository<Tables.Roles> {
  public constructor(context: DbContext) {
    super(context, roles);
  }

  /**
   * @public
   * @async
   * @description Asynchronously inserts a {@link InsertModels.Role} object into the
   * {@link Tables.Roles}.
   *
   * @param role - The {@link NewRole} object to be inserted.
   * @returns - The {@link roles.id} if the insert operation is successful, `undefined` otherwise.
   */
  public async insertOne(role: NewRole): Promise<number | undefined> {
    // const inserted = await this._insertOne({ value: role });
    const inserted = await this.execInsert({
      fn: async (insert, converter) => {
        return await insert
          .values(role)
          .onConflictDoNothing()
          .returning()
          .then((result) => result[0]);
      },
    });

    return inserted?.id;
  }

  public async execInsert<T>(args: RepositoryTypes.InsertArgs.Role<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(roles);
    return await args.fn(insert, this.buildWhereClause);
  }

  /**
   * @public
   * @async
   * @description Asynchronously retrieves a role from the Roles table.
   *
   * @returns - A {@link Promise} resolving to the found {@link RoleViewModel} or `undefined`.
   */
  public async getOne(filter: RoleFilter): Promise<RoleViewModel | undefined> {
    const whereClause =
      filter.searchBy === "id"
        ? eq(roles.id, filter.id)
        : eq(roles.name, filter.name);

    return await this._getOne({ whereClause });
  }

  protected buildWhereClause(
    filter?: RepositoryTypes.QueryFilters.Role | undefined
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType, id, name } = filter;

      if (id !== undefined) conditions.push(eq(roles.id, id));
      if (name && name.trim()) conditions.push(eq(roles.name, name));

      if (conditions.length > 0) {
        return filterType === "or" ? or(...conditions) : and(...conditions);
      }
    }

    return undefined;
  }
}
