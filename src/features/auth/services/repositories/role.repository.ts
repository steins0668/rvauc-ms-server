import { eq } from "drizzle-orm";
import type { DbContext } from "../../../../db/create-context";
import { roles } from "../../../../models";
import { Repository } from "../../../../services";
import { InsertModels, Tables, ViewModels } from "../../types";

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
   * @function insertRole
   * @description Asynchronously inserts a {@link InsertModels.Role} object into the
   * {@link Tables.Roles}.
   *
   * @param role - The {@link NewRole} object to be inserted.
   * @returns - The {@link roles.id} if the insert operation is successful, `undefined` otherwise.
   */
  public async insertRole(role: NewRole): Promise<number | undefined> {
    const inserted = await this._insertOne({ value: role });
    return inserted?.id;
  }
  /**
   * @public
   * @async
   * @function getRole
   * @description Asynchronously retrieves a role from the Roles table.
   *
   * @returns - A {@link Promise} resolving to the found {@link RoleViewModel} or `undefined`.
   */
  public async getRole(filter: RoleFilter): Promise<RoleViewModel | undefined> {
    const whereClause =
      filter.searchBy === "id"
        ? eq(roles.id, filter.id)
        : eq(roles.name, filter.name);

    return await this._getOne({ whereClause });
  }
}
