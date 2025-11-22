import { Request, Response } from "express";
import { Auth } from "../auth";

export namespace Controllers {
  export async function handleGetNotifications(req: Request, res: Response) {
    const { auth, requestLogger } = req;

    const isAllowed = Auth.Core.Utils.ensureAllowedPayload(auth, "full");
  }
}
