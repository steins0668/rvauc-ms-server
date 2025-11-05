import { Core } from "../../../../core";

export function getSignInMethod(
  identifier: string
): "email" | "username" | null {
  const isEmail = Core.Data.Regex.Auth.Email.test(identifier);
  const isUsername = Core.Data.Regex.Auth.Username.test(identifier);

  if (isEmail) return "email";
  else if (isUsername) return "username";
  else return null;
}
