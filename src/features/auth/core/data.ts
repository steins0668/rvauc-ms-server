export namespace Data {
  export namespace Enums {
    export enum Roles {
      student = 0,
      professor,
    }
  }

  export namespace Regex {
    export const Auth = {
      //  * follows default zod regex
      /**
       * @constant EMAIL
       * @description Validates an email address using Zod's default regex rules:
       * - Must not start with a dot (`.`).
       * - Must not contain consecutive dots (`..`).
       * - Local part may contain letters, digits, underscores, plus signs, hyphens, and dots,
       *   but cannot end with a dot.
       * - Must include an `@` followed by a valid domain.
       * - Domain must start with a letter/digit, may include hyphens, and must end with a valid TLD
       *   of at least 2 characters.
       * - Case-insensitive.
       */
      Email:
        /^(?!\.)(?!.*\.\.)([a-z0-9_'+\-\.]*)[a-z0-9_+-]@([a-z0-9][a-z0-9\-]*\.)+[a-z]{2,}$/i,

      /**
       * @constant USERNAME
       * @description Validates a username with the following rules:
       * - Must start with a letter (A–Z, a–z).
       * - May contain letters, digits, hyphens (`-`), or underscores (`_`).
       * - Length must be between 4 and 24 characters.
       */
      Username: /^[a-zA-Z][a-zA-Z0-9-_]{3,23}$/,

      /**
       * @constant PASSWORD
       * @description Validates a password with the following rules:
       * - Must contain at least one lowercase letter (`a–z`).
       * - Must contain at least one uppercase letter (`A–Z`).
       * - Must contain at least one digit (`0–9`).
       * - Must contain at least one special character from: `! @ # $ %`.
       * - Total length must be between 8 and 24 characters.
       */
      Password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/,

      /**
       * @constant STUDENT_NUMBER
       * @description
       * isValidShortNumber("123-4567"); // true
       * isValidShortNumber("12-3456");  // false
       *
       */
      StudentNumber: /^\d{3}-\d{4}$/,
    } as const;
  }
}
