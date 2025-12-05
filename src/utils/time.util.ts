export namespace TimeUtil {
  export function secondsSinceMidnightPh(date: Date) {
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }

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
