import type { Request, Response } from "express";
import { Schemas } from "./schemas";

export namespace Controllers {
  export async function handleSignIn(
    req: Request<{}, {}, Schemas.SignIn.Schema>,
    res: Response
  ) {
    const { body, authenticationService, requestLogger: logger } = req;

    //  * authenticate user

    //  * create jwt

    //  * send token
  }
}
