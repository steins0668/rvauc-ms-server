import { Request } from "express";

export interface ValidatedRequest<P = any, R = any, B = any, Q = any>
  extends Request {
  validated?: Partial<{
    params: P;
    body: B;
    query: Q;
  }>;
}

export interface StrictValidatedRequest<P = any, R = any, B = any, Q = any>
  extends ValidatedRequest<P, R, B, Q> {
  validated: {
    params: P;
    body: B;
    query: Q;
  };
}
