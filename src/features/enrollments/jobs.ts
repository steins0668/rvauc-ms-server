import { Clock } from "../../utils";
import { Core } from "./core";

export namespace Jobs {
  /**
   * ! Cron job
   * * Schedule every day at 00:00:00
   */
  export async function fillClassSessionsToday() {
    const scheduler = await Core.Services.ClassSessionScheduler.create();

    //  * automatically sets hh:mm:ss to last possible ms of the day to record all possible sessions for the day
    return await scheduler.recordAllToday();
  }

  /**
   * ! Only used for when system goes offline.
   * ! Run this as soon as the application starts.
   * ! Not to be scheduled.
   */
  export async function fillClassSessionsUntilToday() {
    const scheduler = await Core.Services.ClassSessionScheduler.create();

    return await scheduler.recordMissingSessions({
      dateRange: { endDate: Clock.now() },
    });
  }
}
