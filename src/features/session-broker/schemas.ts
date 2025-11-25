import z from "zod";

export namespace Schemas {
  export namespace Authentication {
    export const station = z
      .strictObject({
        stationName: z.string(),
      })
      .strip();

    export type Station = z.infer<typeof station>;
  }

  export namespace RequestBody {
    export const serverSignIn = z
      .strictObject({
        method: z.enum(["rfidUid", "studentNumber"]),
        identifier: z.string(),
      })
      .strip();

    export const stationSignIn = z
      .strictObject({
        stationName: z.string(),
        ...serverSignIn.shape,
      })
      .strip();

    export type ServerSignIn = z.infer<typeof serverSignIn>;
    export type StationSignIn = z.infer<typeof stationSignIn>;
  }

  export namespace RequestParams {
    export const stationName = z
      .strictObject({
        stationName: z.string(),
      })
      .strip();

    export type StationName = z.infer<typeof stationName>;
  }
}
