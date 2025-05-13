// src/models/types.ts

import { Event } from '@prisma/client';

// Event types
export enum EVENT_TYPES {
  WORK = 'Work',
  PERSONAL = 'Personal',
  MEETING = 'Meeting',
}

// Event colors - these should match the front-end colors
export const EVENT_COLORS: Record<EVENT_TYPES, string> = {
  [EVENT_TYPES.WORK]: '#4285F4', // Blue
  [EVENT_TYPES.PERSONAL]: '#34A853', // Green
  [EVENT_TYPES.MEETING]: '#FBBC05', // Orange
};

// Recurrence patterns
export type RecurrencePattern = 'None' | 'Daily' | 'Weekly';

// Recurrence rule
export interface RecurrenceRule {
  pattern: RecurrencePattern;
  daysOfWeek?: number[]; // For weekly recurrence (0 = Sunday, 1 = Monday, etc.)
}

// Calendar event
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  color: string;
  eventType: string;
  recurrence?: RecurrenceRule;
}

// Request Types
export interface CreateEventDto {
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  eventType: string;
  recurrence?: {
    pattern: RecurrencePattern;
    daysOfWeek?: number[];
  };
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string
  eventType?: string;
  recurrence?: {
    pattern: RecurrencePattern;
    daysOfWeek?: number[];
  };
}

export interface UpdateSingleOccurrenceDto {
  newStartTime?: string; // ISO date string
  newEndTime?: string; // ISO date string
  isDeleted?: boolean;
}

export interface EventQueryParams {
  date?: string; // ISO date string
  timezone?: string;
}

// Response Types
export interface EventOccurrence {
  id: string;
  originalEventId: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  color: string;
  eventType: string;
  isRecurring: boolean;
  isException: boolean;
  exceptionId?: string;
  recurrence?: RecurrenceRule;
}

// Enhanced Types with Computed Properties
export interface EventWithOccurrences extends Event {
  occurrences: EventOccurrence[];
}
