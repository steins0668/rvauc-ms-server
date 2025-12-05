import "dotenv/config";

export class FakeClock {
  static now() {
    return new Date(process.env.FAKE_DATE as string);
  }
  static nowMs() {
    return new Date(process.env.FAKE_DATE as string);
  }
}
