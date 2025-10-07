import { Request, Response, NextFunction } from "express";

export function setHeaderCredentials(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const whitelist = ["http://localhost:5173"];
  const origin = req.headers.origin;
  if (origin && whitelist.includes(origin)) {
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Origin", origin);
  }
  next();
}
