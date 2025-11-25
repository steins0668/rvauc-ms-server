export namespace BaseResponse {
  export type Success<TResult> = {
    success: true;
    result: TResult;
    message?: string;
  };

  export type Fail = {
    success: false;
    message?: string;
  };

  export type Union<TResult> = Success<TResult> | Fail;
}
