import { NextFunction, Request, Response } from "express";

export function validateCookies(...cookieNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { requestLogger } = req;

    const { cookies } = req;
    const nameList = [...cookieNames];

    requestLogger.log("debug", "Validating cookies...");
    requestLogger.log("debug", `Cookie list: ${nameList}`);

    for (const cookieName of nameList) {
      if (!cookies[cookieName]) {
        requestLogger.log(
          "debug",
          `Required cookie is missing: ${cookieName}.`
        );
        const message = "A required cookie is missing.";

        res.status(401).json({ success: false, message });
        return;
      }
    }

    requestLogger.log("debug", "Cookies validated.");

    next();
  };
}
