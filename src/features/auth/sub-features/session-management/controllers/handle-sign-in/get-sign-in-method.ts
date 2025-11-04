import { Registration } from "../../../registration";

export function getSignInMethod(
  identifier: string
): "email" | "username" | null {
  const isEmail = Registration.Data.Regex.Auth.Email.test(identifier);
  const isUsername = Registration.Data.Regex.Auth.Username.test(identifier);

  if (isEmail) return "email";
  else if (isUsername) return "username";
  else return null;
}
