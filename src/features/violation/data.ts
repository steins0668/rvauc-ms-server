export namespace Data {
  export namespace Records {
    export const ViolationStatus = {
      unsettled: 0,
      settled: 1,
    } as const;

    export const ViolationReason = {
      incorrectFootwear: "incorrect footwear",
      noId: "no id",
      incorrectUpperwear: "incorrect upperwear",
      incorrectBottoms: "incorrect bottoms",
    } as const;
  }
}
