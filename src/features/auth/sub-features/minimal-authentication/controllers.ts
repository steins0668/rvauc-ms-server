import type { Request, Response } from "express";
import { Schemas } from "./schemas";
import { Core } from "../../core";

export namespace Controllers {
  export async function handleSignIn(
    req: Request<{}, {}, Schemas.SignIn.MethodsSchema>,
    res: Response
  ) {
    const {
      body,
      authenticationService,
      userDataService,
      requestLogger: logger,
    } = req;

    logger.log("info", "Attempting minimal authentication...");

    logger.log("debug", "Authenticating...");
    const authentication = await authenticationService.authenticate({
      type: "session",
      identifier: body.identifier,
    });

    if (!authentication.success) {
      //  !authentication failed
      const { error } = authentication;

      // todo:  const safeId = getSafeId(body.identifier);
      const logMsg = "Failed sign-in attempt in minimal authentication.";
      logger.log("error", logMsg, error);

      return res
        .status(Core.Errors.Authentication.getErrStatusCode(error))
        .json({ success: false, message: error.message });
    }

    const { result: user } = authentication;

    logger.log("debug", "Creating payloads...");
    const createAccessPayload = await Core.Utils.payloadResolver[user.role]({
      type: "minimal",
      dataService: userDataService,
      user,
    });

    if (!createAccessPayload.success) {
      const { error } = createAccessPayload;

      logger.log("error", "Failed creating payload", error);

      const message = "Something went wrong. Please try again later.";
      return res
        .status(Core.Errors.Authentication.getErrStatusCode(error))
        .json({ success: false, message });
    }

    const { result } = createAccessPayload;

    logger.log("debug", "Creating tokens...");
    const tknCreation = Core.Utils.createTokens({
      type: "minimal",
      access: createAccessPayload.result,
    });

    if (!tknCreation.success) {
      const { error } = tknCreation;

      logger.log(
        "error",
        "Failed creating access token for minimal authentication.",
        error
      );

      return res
        .status(Core.Errors.Authentication.getErrStatusCode(error))
        .json({
          success: false,
          message:
            "An error occurred while authenticating. Please try again later.",
        });
    }
    //  * send token

    res.json({ success: true, result: tknCreation.result.accessToken });
  }
}
