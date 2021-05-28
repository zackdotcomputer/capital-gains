import { DateTime } from "luxon";

// Ugh they're of the format "20210429000000.000"
export default function parseHorribleDate(dateString: string): string {
  if (!dateString) {
    throw Error("Didn't get a date string");
  }
  const dt = DateTime.fromFormat(dateString, "yyyyMMddHHmmss.u");
  return String(dt.toMillis());
}
