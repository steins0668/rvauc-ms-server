import { Request } from "express";

export interface ValidatedRequest<P = any, R = any, B = any, Q = any>
  extends Request<P, R, B> {
  validated?: Partial<{
    params: P;
    body: B;
    query: Q;
  }>;
}

export interface StrictValidatedRequest<T = any, R = any, B = any, Q = any>
  extends ValidatedRequest<T, R, B, Q> {
  validated: {
    params: T;
    body: B;
    query: Q;
  };
}
