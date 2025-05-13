// src/models/types.ts

import { Event, User } from '@prisma/client';

// Define event types locally
export enum EventType {
  WORK = 'Work',
  PERSONAL = 'Personal',
  MEETING = 'Meeting',
}

// Define recurrence types locally
export enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

// Request Types
export interface CreateEventDto {
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  type: EventType;
  recurrenceType: RecurrenceType;
  recurrenceRule?: RecurrenceRuleDto;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string
  type?: EventType;
  recurrenceType?: RecurrenceType;
  recurrenceRule?: RecurrenceRuleDto;
}

export interface RecurrenceRuleDto {
  daysOfWeek?: number[]; // For WEEKLY: 0=Sunday, 1=Monday, etc.
  endDate?: string; // ISO date string
  count?: number; // Number of occurrences
}

export interface UpdateSingleOccurrenceDto {
  newStartTime?: string; // ISO date string
  newEndTime?: string; // ISO date string
  isDeleted?: boolean;
}

export interface EventQueryParams {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  type?: EventType;
}

// Response Types
export interface EventOccurrence {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  type: EventType;
  isRecurring: boolean;
  isException: boolean;
  originalEventId?: string;
}

// Enhanced Types with Computed Properties
export interface EventWithOccurrences extends Event {
  occurrences: EventOccurrence[];
}

// Auth Types
export interface RegisterUserDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

// Express Request Extension
export interface RequestWithUser extends Express.Request {
  user?: User;
}
