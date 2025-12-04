export namespace TimeUtil {
  export function secondsSinceMidnightPh(d: Date) {
    const ph = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

    return ph.getHours() * 3600 + ph.getMinutes() * 60 + ph.getSeconds();
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
