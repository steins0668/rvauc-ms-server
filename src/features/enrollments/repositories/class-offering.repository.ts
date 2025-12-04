import { and, eq, or, SQL, Table } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { classOfferings } from "../../../models";
import { Repository } from "../../../services";
import { BaseRepositoryType } from "../../../types";
import { RepositoryUtil } from "../../../utils";
import { Types } from "../types";

export class ClassOffering extends Repository<Types.Tables.ClassOffering> {
  public constructor(context: DbContext) {
    super(context, classOfferings);
  }

  public async execInsert<T>(
    args: Types.Repository.InsertArgs.ClassOffering<T>
  ) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(classOfferings);
    return await args.fn(insert, ClassOffering.buildWhereClause);
  }

  public getSubQuery<T>(args: Types.Repository.SubQueryArgs.ClassOffering<T>) {
    const selectBase = (args.dbOrTx ?? this._dbContext)
      .select()
      .from(classOfferings);

    return args.fn({
      table: classOfferings,
      selectBase,
      converter: ClassOffering.buildWhereClause,
      order: ClassOffering.buildOrder,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.ClassOffering<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.classOfferings;
    return await args.fn(query, ClassOffering.buildWhereClause);
  }

  public async execUpdate<T>(
    args: Types.Repository.UpdateArgs.ClassOffering<T>
  ) {
    const update = (args.dbOrTx ?? this._dbContext).update(classOfferings);
    return await args.fn(update, ClassOffering.buildWhereClause);
  }

  public async execDelete<T>(
    args: Types.Repository.DeleteArgs.ClassOffering<T>
  ) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(classOfferings);
    return await args.fn(deleteBase, ClassOffering.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.ClassOffering
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const {
        filterType = "or",
        id,
        classId,
        classNumber,
        weekDay,
        startTime,
        endTime,
        custom,
      } = filter;

      if (id !== undefined) conditions.push(eq(classOfferings.id, id));
      if (classId !== undefined)
        conditions.push(eq(classOfferings.classId, classId));
      if (classNumber && classNumber.trim())
        conditions.push(eq(classOfferings.classNumber, classNumber));
      if (weekDay && weekDay.trim())
        conditions.push(eq(classOfferings.weekDay, weekDay));
      if (startTime !== undefined)
        conditions.push(eq(classOfferings.startTime, startTime));
      if (endTime !== undefined)
        conditions.push(eq(classOfferings.endTime, endTime));
      if (custom)
        conditions.push(...custom(classOfferings, RepositoryUtil.filters));
      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  protected static buildOrder(
    configureOrder: BaseRepositoryType.ConfigureOrder<Types.Tables.ClassOffering>
  ) {
    return configureOrder(classOfferings, RepositoryUtil.orderOperators);
  }
}
