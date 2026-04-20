import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  exists,
  notExists,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  like,
  ilike,
  notIlike,
  not,
  and,
  or,
  arrayContains,
  arrayContained,
  arrayOverlaps,
  asc,
  desc,
} from "drizzle-orm";
import { BaseRepositoryType } from "../types";

export namespace RepositoryUtil {
  export const filters = {
    eq,
    ne,
    gt,
    gte,
    lt,
    lte,
    exists,
    notExists,
    isNull,
    isNotNull,
    inArray,
    notInArray,
    like,
    ilike,
    notIlike,
    not,
    and,
    or,
    arrayContains,
    arrayContained,
    arrayOverlaps,
  } as const;

  export const orderOperators = { asc, desc } as const;

  export function resolveOffsetFromPage(
    c?: Partial<{ limit: number; page: number }> | undefined,
  ) {
    const limit = resolveLimit(c) ?? 6;
    return (c?.page ?? 1 - 1) * limit;
  }

  export function resolveLimit(
    c?: BaseRepositoryType.QueryConstraints,
    defaultLimit = 6,
  ) {
    if (c?.unlimited) return undefined;
    return c?.limit ?? defaultLimit;
  }

  export function resolveOffset(c?: BaseRepositoryType.QueryConstraints) {
    if (c?.unlimited) return undefined;
    return c?.offset ?? 0;
  }
}
