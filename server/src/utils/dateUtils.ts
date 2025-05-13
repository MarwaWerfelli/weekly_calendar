// src/utils/dateUtils.ts

import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
  differenceInMilliseconds,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/**
 * Converts a date string to UTC
 */
export const toUTC = (dateStr: string, timeZone = 'UTC'): Date => {
  // Simple implementation without zonedTimeToUtc
  const date = parseISO(dateStr);
  // This is a simplified version - in a real app, proper timezone conversion would be needed
  return date;
};

/**
 * Converts a UTC date to a specific timezone
 */
export const fromUTC = (date: Date, timeZone = 'UTC'): Date => {
  // Simple implementation without utcToZonedTime
  // This is a simplified version - in a real app, proper timezone conversion would be needed
  return toZonedTime(date, timeZone);
};

/**
 * Gets the week start and end dates for a given date
 */
export const getWeekBounds = (
  date: Date,
  timeZone = 'UTC',
  weekStartsOn = 0 as 0, // 0 = Sunday, 1 = Monday, etc.
): { start: Date; end: Date } => {
  const localDate = fromUTC(date, timeZone);
  // Cast to 0 | 1 | 2 | 3 | 4 | 5 | 6 to satisfy the Day type
  const day = weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const start = startOfWeek(localDate, { weekStartsOn: day });
  const end = endOfWeek(localDate, { weekStartsOn: day });

  // Convert back to UTC
  return {
    start: toUTC(start.toISOString(), timeZone),
    end: toUTC(end.toISOString(), timeZone),
  };
};

/**
 * Formats a date to ISO string
 */
export const formatISODate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Formats a date to display format
 */
export const formatDisplayDate = (date: Date, timeZone = 'UTC'): string => {
  const localDate = fromUTC(date, timeZone);
  return format(localDate, 'MMM d, yyyy h:mm a');
};

/**
 * Gets formatted date range for a week
 */
export const getWeekRangeDisplay = (date: Date, timeZone = 'UTC'): string => {
  const { start, end } = getWeekBounds(date, timeZone);
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
};

/**
 * Calculates event duration in milliseconds
 */
export const getEventDuration = (start: Date, end: Date): number => {
  return differenceInMilliseconds(end, start);
};

/**
 * Creates a date for a specific day in the week of the reference date
 */
export const getDateForDayInWeek = (
  referenceDate: Date,
  dayOfWeek: number, // 0 = Sunday, 1 = Monday, etc.
  timeZone = 'UTC',
): Date => {
  const { start } = getWeekBounds(referenceDate, timeZone);
  return addDays(start, dayOfWeek);
};

/**
 * Checks if two time ranges overlap
 */
export const doTimeRangesOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean => {
  return start1 < end2 && start2 < end1;
};
