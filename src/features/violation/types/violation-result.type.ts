import { BaseResult } from "../../../types";
import { Errors } from "../errors";

export namespace ViolationResult {
  export type Success<T> = BaseResult.Success<T>;
  export type Fail = BaseResult.Fail<Errors.ViolationData.ErrorClass>;
}
