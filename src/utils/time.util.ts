export namespace TimeUtil {
  export function secondsSinceMidnightPh(date: Date) {
    const [hours, minutes, seconds] = date
      .toLocaleTimeString("en-US", {
        timeZone: "Asia/Manila",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
      .split(":")
      .map((value) => Number(value) ?? 0);

    return hours! * 3600 + minutes! * 60 + seconds!;
  }

  /**
   * to yyyy-mm-dd format
   * @param date
   * @returns
   */
  export const toPhDate = (date: Date) =>
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);

  /**
   * To ph timezone hh:mm 12-hour format
   * @param date
   * @returns
   */
  export const toPhTime = (date: Date) =>
    new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);

  export function toLocaleTimeStringPh(date: Date) {
    return date.toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}
