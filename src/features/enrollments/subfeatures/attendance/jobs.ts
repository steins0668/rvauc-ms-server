import { TimeUtil } from "../../../../utils";
import { Services } from "./services";

export namespace Jobs {
  export async function markAbsent() {
    const absenceAutomation =
      await Services.AttendanceAbsenceAutomation.create();

    const date = new Date();
    const datePh = TimeUtil.toPhDate(date);
    const timePh = TimeUtil.toPhTime(date);

    const automation = await absenceAutomation.markMissingForDate({
      date,
    });

    if (!automation.success) {
      console.error(automation.error);
      return;
    }

    const { inserted } = automation.result.generated;

    console.log(
      `Recorded ${inserted.length} absentees at ${datePh} ${timePh}.`,
    );
  }
}
