import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { parseISO } from "date-fns";

export function clientTimeToUTC(
  dateTimeString: string,
  timeZone: string
): Date {
  // Expects dateTimeString like "YYYY-MM-DDTHH:mm" or full ISO
  return toZonedTime(parseISO(dateTimeString), timeZone);
}

export function utcToClientZonedTime(utcDate: Date, timeZone: string): Date {
  return toZonedTime(utcDate, timeZone);
}
