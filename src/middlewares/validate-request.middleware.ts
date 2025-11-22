import { NextFunction, Request, Response } from "express";
import z from "zod";

type RequestSchemas<
  PS extends z.ZodType = z.ZodType,
  QS extends z.ZodType = z.ZodType,
  BS extends z.ZodType = z.ZodType
> = {
  params?: PS;
  query?: QS;
  body?: BS;
};

export function validateRequest<
  PS extends z.ZodType = z.ZodType,
  QS extends z.ZodType = z.ZodType,
  BS extends z.ZodType = z.ZodType,
  P = z.infer<PS>,
  Q = z.infer<QS>,
  B = z.infer<BS>
>(
  schemas: RequestSchemas<PS, QS, BS>
): (req: Request<P, {}, B, Q>, res: Response, next: NextFunction) => void {
  return (req: Request<P, {}, B, Q>, res: Response, next: NextFunction) => {
    const { requestLogger } = req;

    requestLogger.log("debug", "Validating request schemas...");

    let errorMessages = [];
    if (schemas.params) {
      requestLogger.log("debug", "Validating params...");

      const parsedParams = schemas.params.safeParse(req.params);
      const { data, error, success } = parsedParams;

      if (success) req.params = data as P;
      else {
        errorMessages.push(z.prettifyError(error));

        requestLogger.log(
          "error",
          "Failed validating request params.",
          z.treeifyError(error)
        );
      }
    }

    if (schemas.query) {
      requestLogger.log("debug", "Validating query...");

      const parsedQuery = schemas.query.safeParse(req.query);
      const { data, error, success } = parsedQuery;

      if (success) req.query = data as Q;
      else {
        errorMessages.push(z.prettifyError(error));

        requestLogger.log(
          "error",
          "Failed validating request query.",
          z.treeifyError(error)
        );
      }
    }

    if (schemas.body) {
      requestLogger.log("debug", "Validating body...");

      const parsedBody = schemas.body.safeParse(req.body);
      const { data, error, success } = parsedBody;

      if (success) req.body = data as B;
      else {
        errorMessages.push(z.prettifyError(error));

        requestLogger.log(
          "error",
          "Failed validating request body.",
          z.treeifyError(error)
        );
      }
    }

    if (errorMessages.length > 0) {
      const message = errorMessages.join("\n");
      res.status(400).json({ success: false, message });
      return;
    }

    requestLogger.log("debug", "Request schemas validated.");
    next();
  };
}
