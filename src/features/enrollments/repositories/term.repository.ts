import { and, eq, or, sql, SQL } from "drizzle-orm";
import { DbContext } from "../../../db/create-context";
import { terms } from "../../../models";
import { Repository } from "../../../services";
import { Types } from "../types";
import { RepositoryUtil } from "../../../utils";

export class Term extends Repository<Types.Tables.Term> {
  public constructor(context: DbContext) {
    super(context, terms);
  }

  public async execInsert<T>(args: Types.Repository.InsertArgs.Term<T>) {
    const insert = (args.dbOrTx ?? this._dbContext).insert(terms);
    return await args.fn({
      table: terms,
      insert,
      converter: Term.buildWhereClause,
      sql,
    });
  }

  public async execQuery<T>(args: Types.Repository.QueryArgs.Term<T>) {
    const query = (args.dbOrTx ?? this._dbContext).query.terms;
    return await args.fn(query, Term.buildWhereClause);
  }

  public async execUpdate<T>(args: Types.Repository.UpdateArgs.Term<T>) {
    const update = (args.dbOrTx ?? this._dbContext).update(terms);
    return await args.fn(update, Term.buildWhereClause);
  }

  public async execDelete<T>(args: Types.Repository.DeleteArgs.Term<T>) {
    const deleteBase = (args.dbOrTx ?? this._dbContext).delete(terms);
    return await args.fn(deleteBase, Term.buildWhereClause);
  }

  public static buildWhereClause(
    filter?: Types.Repository.QueryFilters.Term
  ): SQL | undefined {
    const conditions = [];

    if (filter) {
      const { filterType = "or", id, yearStart, yearEnd, semester } = filter;

      if (id !== undefined) conditions.push(eq(terms.id, id));
      if (yearStart !== undefined)
        conditions.push(eq(terms.yearStart, yearStart));
      if (yearEnd !== undefined) conditions.push(eq(terms.yearEnd, yearEnd));
      if (semester !== undefined) conditions.push(eq(terms.semester, semester));

      if (conditions.length > 0)
        return filterType === "or" ? or(...conditions) : and(...conditions);
    }

    return undefined;
  }

  public static sqlWhere(builder: Types.Repository.WhereBuilders.Term) {
    return builder(terms, RepositoryUtil.filters);
  }

  public static sqlOrderBy(builder: Types.Repository.OrderBuilders.Term) {
    return builder(terms, RepositoryUtil.orderOperators);
  }
}
