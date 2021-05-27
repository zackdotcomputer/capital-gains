import { DateTime } from "luxon";

// Ugh they're of the format "20210429000000.000"
export default function parseHorribleDate(dateString: string): DateTime {
  return DateTime.fromFormat(dateString, "yyyyMMddHHmmss.u");
}
