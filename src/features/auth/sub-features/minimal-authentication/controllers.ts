import type { Request, Response } from "express";
import { Schemas } from "./schemas";
import { Core } from "../../core";

export namespace Controllers {
  export async function handleSignIn(
    req: Request<{}, {}, Schemas.SignIn.Schema>,
    res: Response
  ) {
    const {
      body,
      authenticationService,
      userDataService,
      requestLogger: logger,
    } = req;

    //  * authenticate user
    const authentication = await authenticationService.authenticate({
      type: "session",
      identifier: body.type,
    });

    if (!authentication.success) {
      //  !authentication failed
      const { error } = authentication;

      res
        .status(Core.Errors.Authentication.getErrStatusCode(error))
        .json({ success: false, message: error.message });

      // todo:  const safeId = getSafeId(body.identifier);
      const logMsg = "Failed sign-in attempt in minimal authentication.";
      logger.log("error", logMsg, error);

      return;
    }

    const { result: user } = authentication;

    //  * create payload
    const createAccessPayload = await Core.Utils.payloadResolver[
      user.role as Core.Data.Records.Role
    ]({ type: "minimal", dataService: userDataService, user });

    if (!createAccessPayload.success) {
      const { error } = createAccessPayload;
      const message = "Something went wrong. Please try again later.";

      res
        .status(Core.Errors.Authentication.getErrStatusCode(error))
        .json({ success: false, message });

      logger.log("debug", "Failed creating payload", error);
      return;
    }

    const { result } = createAccessPayload;

    //  * create tokens
    const tknCreation = Core.Utils.createTokens({
      type: "minimal",
      access: createAccessPayload.result,
    });

    if (!tknCreation.success) {
      const { error } = tknCreation;

      res.status(Core.Errors.Authentication.getErrStatusCode(error)).json({
        success: false,
        message:
          "An error occurred while authenticating. Please try again later.",
      });

      logger.log(
        "error",
        "Failed creating access token for minimal authentication.",
        error
      );
      return;
    }
    //  * send token

    res.json({ success: true, accessToken: tknCreation.result });
  }
}
