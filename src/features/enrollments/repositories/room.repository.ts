import { and, eq, isNull, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { rooms } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class Room extends Repository<Types.Tables.Room> {
  public constructor(context: DbContext) {
    super(context, rooms);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Room<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(rooms);
    return await args.fn({
      table: rooms,
      insert,
      converter: Room.buildWhereClause,
      sql,
    });
  }

  public getContext<T>(args: Types.Repository.ContextArgs.Room<T>) {
    const context = args.dbOrTx ?? this._dbContext;

    return args.fn({
      table: rooms,
      context,
      converter: Room.buildWhereClause,
      order: Room.sqlOrderBy,
      sql,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Room<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.rooms;
    return await args.fn(query, Room.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.Room<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(rooms);
    return await args.fn(update, Room.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.Room<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(rooms);
    return await args.fn(deleteBase, Room.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Room,
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, name, building, custom } = filter;

      if (id !== undefined) conditions.push(eq(rooms.id, id));
      if (name !== undefined && name !== null)
        conditions.push(eq(rooms.name, name));
      if (building !== undefined)
        conditions.push(
          building === null
            ? isNull(rooms.building)
            : eq(rooms.building, building),
        );
      if (custom) conditions.push(...custom(rooms, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  public static sqlWhere(builder: Types.Repository.WhereBuilders.Room) {
    return builder(rooms, RepositoryUtil.filters);
  }

  public static sqlOrderBy(
    builder: BaseRepositoryType.OrderBuilder<Types.Tables.Room>,
  ) {
    return builder(rooms, RepositoryUtil.orderOperators);
  }
}
