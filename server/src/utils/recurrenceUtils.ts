import { addDays, getDay, startOfDay, isWithinInterval } from 'date-fns';
import { RecurrencePattern } from '../models/type';

/**
 * Calculates if a given date falls on one of the days specified in recurrenceDays
 * @param date The date to check
 * @param recurrenceDays Array of days (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 */
export function isRecurrenceDay(date: Date, recurrenceDays: number[]): boolean {
  const dayOfWeek = getDay(date); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  return recurrenceDays.includes(dayOfWeek);
}

/**
 * Get the next occurrence of a recurring event after a given date
 * @param baseDate The base date of the event
 * @param recurrenceType The type of recurrence
 * @param recurrenceDays For weekly recurrence, array of days (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 * @param afterDate Find the next occurrence after this date
 */
export function getNextOccurrence(
  baseDate: Date,
  recurrenceType: RecurrencePattern,
  recurrenceDays: number[],
  afterDate: Date,
): Date | null {
  if (recurrenceType === 'None') {
    return null;
  }

  let currentDate = new Date(afterDate);

  // Maximum of 365 days to prevent infinite loops
  const maxEndDate = new Date(afterDate);
  maxEndDate.setDate(maxEndDate.getDate() + 365);

  // For daily recurrence
  if (recurrenceType === 'Daily') {
    // If afterDate is before or equal to baseDate, return baseDate
    if (afterDate <= baseDate) {
      return baseDate;
    }

    // Otherwise, return next day after afterDate
    return addDays(startOfDay(afterDate), 1);
  }

  // For weekly recurrence
  if (recurrenceType === 'Weekly') {
    // If recurrenceDays is empty or invalid, return null
    if (!recurrenceDays || recurrenceDays.length === 0) {
      return null;
    }

    // Start checking from the afterDate
    while (currentDate <= maxEndDate) {
      if (isRecurrenceDay(currentDate, recurrenceDays)) {
        // If this is a recurrence day and it's after afterDate, return it
        if (currentDate > afterDate) {
          const result = new Date(currentDate);
          // Set hours and minutes from the base date
          result.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
          return result;
        }
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return null;
}

/**
 * Generates all occurrences of a recurring event within a specified date range
 * @param baseDate The base date of the event
 * @param duration Duration of the event in milliseconds
 * @param recurrenceType The type of recurrence
 * @param recurrenceDays For weekly recurrence, array of days (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 * @param startRange Start of the date range
 * @param endRange End of the date range
 * @param exceptions Array of exception dates where the event is modified or deleted
 */
export function generateOccurrences(
  baseDate: Date,
  duration: number,
  recurrenceType: RecurrencePattern,
  recurrenceDays: number[],
  startRange: Date,
  endRange: Date,
  exceptions: { date: Date; isDeleted: boolean; newStartTime?: Date; newEndTime?: Date }[] = [],
): { start: Date; end: Date; isException: boolean; exceptionData?: any }[] {
  const occurrences: { start: Date; end: Date; isException: boolean; exceptionData?: any }[] = [];

  if (recurrenceType === 'None') {
    // For non-recurring events, check if the baseDate falls within our range
    if (isWithinInterval(baseDate, { start: startRange, end: endRange })) {
      occurrences.push({
        start: new Date(baseDate),
        end: new Date(baseDate.getTime() + duration),
        isException: false,
      });
    }
    return occurrences;
  }

  // Start from the original event date or the start of our range, whichever is later
  let currentDate = baseDate > startRange ? new Date(baseDate) : new Date(startRange);

  // Go back up to 365 days to ensure we catch recurring events that started before our range
  if (baseDate < startRange) {
    const checkFromDate = new Date(baseDate);
    while (checkFromDate < startRange) {
      if (recurrenceType === 'Daily') {
        checkFromDate.setDate(checkFromDate.getDate() + 1);
      } else if (recurrenceType === 'Weekly') {
        checkFromDate.setDate(checkFromDate.getDate() + 1);

        if (
          isRecurrenceDay(checkFromDate, recurrenceDays) &&
          checkFromDate > baseDate &&
          checkFromDate < startRange
        ) {
          currentDate = new Date(checkFromDate);
        }
      }
    }
  }

  // Make sure we start with the correct time
  currentDate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

  // Generate occurrences until we reach the end range
  while (currentDate <= endRange) {
    let shouldInclude = false;

    if (recurrenceType === 'Daily') {
      shouldInclude = true;
    } else if (recurrenceType === 'Weekly') {
      shouldInclude = isRecurrenceDay(currentDate, recurrenceDays);
    }

    if (shouldInclude && currentDate >= startRange) {
      // Check if this occurrence has an exception
      const exception = exceptions.find(
        (ex) =>
          ex.date.getFullYear() === currentDate.getFullYear() &&
          ex.date.getMonth() === currentDate.getMonth() &&
          ex.date.getDate() === currentDate.getDate(),
      );

      if (exception) {
        if (!exception.isDeleted) {
          // This is a modified occurrence
          occurrences.push({
            start: exception.newStartTime || new Date(currentDate),
            end: exception.newEndTime || new Date(currentDate.getTime() + duration),
            isException: true,
            exceptionData: exception,
          });
        }
        // If isDeleted is true, we skip this occurrence
      } else {
        // Regular occurrence
        occurrences.push({
          start: new Date(currentDate),
          end: new Date(currentDate.getTime() + duration),
          isException: false,
        });
      }
    }

    // Move to the next occurrence based on recurrence type
    if (recurrenceType === 'Daily') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (recurrenceType === 'Weekly') {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return occurrences;
}

/**
 * Checks if two events conflict with each other
 * @param event1Start Start time of first event
 * @param event1End End time of first event
 * @param event2Start Start time of second event
 * @param event2End End time of second event
 */
export function eventsConflict(
  event1Start: Date,
  event1End: Date,
  event2Start: Date,
  event2End: Date,
): boolean {
  // Events conflict if one starts during the other or ends during the other
  return (
    (event1Start >= event2Start && event1Start < event2End) || // Event 1 starts during Event 2
    (event1End > event2Start && event1End <= event2End) || // Event 1 ends during Event 2
    (event2Start >= event1Start && event2Start < event1End) || // Event 2 starts during Event 1
    (event2End > event1Start && event2End <= event1End) // Event 2 ends during Event 1
  );
}
