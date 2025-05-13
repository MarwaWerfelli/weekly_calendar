import { Event } from '@prisma/client';
import { isSameDay, getDay } from 'date-fns';
import prisma from '../prismaClient';
import {
  CalendarEvent,
  EVENT_COLORS,
  EVENT_TYPES,
  EventOccurrence,
  RecurrencePattern,
} from '../models/type';

export interface EventWithExceptions extends Event {
  exceptions: {
    id: string;
    exceptionDate: Date;
    isDeleted: boolean;
    newStartTime: Date | null;
    newEndTime: Date | null;
  }[];
}

export class EventService {
  /**
   * Get a specific event by ID
   */
  async getEventById(eventId: string): Promise<Event | null> {
    return prisma.event.findUnique({
      where: { id: eventId },
    });
  }

  /**
   * Get all events for a date range
   */
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<EventOccurrence[]> {
    // Get all events that might have occurrences in the date range
    const events = await prisma.event.findMany({
      where: {
        OR: [
          // Non-recurring events that fall within the date range
          {
            startTime: { lte: endDate },
            endTime: { gte: startDate },
            recurrencePattern: 'None',
          },
          // All recurring events (we'll filter their occurrences later)
          {
            recurrencePattern: {
              in: ['Daily', 'Weekly'],
            },
          },
        ],
      },
      include: {
        exceptions: true,
      },
    });

    // Generate all event occurrences within the date range
    const occurrences: EventOccurrence[] = [];

    for (const event of events) {
      if (event.recurrencePattern === 'None') {
        // Add non-recurring event directly if it falls within the range
        if (event.startTime >= startDate && event.startTime <= endDate) {
          occurrences.push(this.mapToEventOccurrence(event));
        }
        continue;
      }

      // For recurring events, generate all occurrences within the range
      const eventOccurrences = this.generateRecurringEventOccurrences(
        event as EventWithExceptions,
        startDate,
        endDate,
      );

      occurrences.push(...eventOccurrences);
    }

    return occurrences;
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    eventType: string;
    recurrencePattern: RecurrencePattern;
    recurrenceDays?: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday
  }): Promise<CalendarEvent> {
    // Determine color based on event type
    // If the eventType is one of our defined types, use the corresponding color
    // Otherwise, use the default blue color
    const color = Object.values(EVENT_TYPES).includes(eventData.eventType as EVENT_TYPES)
      ? EVENT_COLORS[eventData.eventType as EVENT_TYPES]
      : '#4285F4';

    const event = await prisma.event.create({
      data: {
        title: eventData.title,
        description: eventData.description || null,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        color,
        eventType: eventData.eventType,
        recurrencePattern: eventData.recurrencePattern,
        recurrenceDays: eventData.recurrenceDays ? eventData.recurrenceDays.join(',') : '',
      },
    });

    // Map to CalendarEvent format
    return {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      start: event.startTime,
      end: event.endTime,
      color: event.color,
      eventType: event.eventType,
      recurrence:
        eventData.recurrencePattern !== 'None'
          ? {
              pattern: eventData.recurrencePattern,
              daysOfWeek: eventData.recurrenceDays,
            }
          : undefined,
    };
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    eventData: {
      title?: string;
      description?: string | null;
      startTime?: Date;
      endTime?: Date;
      eventType?: string;
      recurrencePattern?: RecurrencePattern;
      recurrenceDays?: number[];
    },
  ): Promise<CalendarEvent> {
    // Update color if event type is changing
    let color: string | undefined;
    if (eventData.eventType) {
      // If the eventType is one of our defined types, use the corresponding color
      // Otherwise, use the default blue color
      color = Object.values(EVENT_TYPES).includes(eventData.eventType as EVENT_TYPES)
        ? EVENT_COLORS[eventData.eventType as EVENT_TYPES]
        : '#4285F4';
    }

    // Convert recurrenceDays array to string if provided
    const updateData: any = { ...eventData, color };
    if (updateData.recurrenceDays) {
      updateData.recurrenceDays = updateData.recurrenceDays.join(',');
    }

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    // Map to CalendarEvent format
    return {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      start: event.startTime,
      end: event.endTime,
      color: event.color,
      eventType: event.eventType,
      recurrence:
        event.recurrencePattern !== 'None'
          ? {
              pattern: event.recurrencePattern as RecurrencePattern,
              daysOfWeek: event.recurrenceDays
                ? event.recurrenceDays.split(',').map(Number)
                : undefined,
            }
          : undefined,
    };
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    await prisma.event.delete({
      where: { id: eventId },
    });
    return true;
  }

  /**
   * Create an exception for a recurring event (modifying or deleting a specific occurrence)
   */
  async createEventException(
    eventId: string,
    exceptionDate: Date,
    isDeleted: boolean = true,
    newStartTime?: Date,
    newEndTime?: Date,
  ) {
    return prisma.recurrenceException.create({
      data: {
        eventId,
        exceptionDate,
        isDeleted,
        newStartTime: newStartTime || null,
        newEndTime: newEndTime || null,
      },
    });
  }

  /**
   * Generate all occurrences of a recurring event within a date range
   */
  private generateRecurringEventOccurrences(
    event: EventWithExceptions,
    startDate: Date,
    endDate: Date,
  ): EventOccurrence[] {
    const occurrences: EventOccurrence[] = [];

    if (event.recurrencePattern === 'None') {
      return [];
    }

    // Start from the first occurrence which is the original event date
    let currentDate = new Date(event.startTime);
    const startHour = event.startTime.getHours();
    const startMinute = event.startTime.getMinutes();
    const startSecond = event.startTime.getSeconds();
    const durationMs = event.endTime.getTime() - event.startTime.getTime();

    // Go back up to 365 days to make sure we catch recurring events that started before our range
    const checkFromDate = new Date(startDate);
    checkFromDate.setDate(checkFromDate.getDate() - 365);

    if (currentDate < checkFromDate) {
      currentDate = new Date(checkFromDate);
    }

    // Maximum of 365 days from the end date to prevent infinite loops
    const maxEndDate = new Date(endDate);
    maxEndDate.setDate(maxEndDate.getDate() + 365);

    // Generate occurrences until we reach the end date
    while (currentDate <= maxEndDate) {
      const currentDay = getDay(currentDate); // 0=Sunday, 1=Monday, ... 6=Saturday

      let shouldInclude = false;

      // Check if this occurrence should be included based on recurrence type
      if (event.recurrencePattern === 'Daily') {
        shouldInclude = true;
      } else if (
        event.recurrencePattern === 'Weekly' &&
        event.recurrenceDays &&
        event.recurrenceDays.split(',').map(Number).includes(currentDay)
      ) {
        shouldInclude = true;
      }

      if (shouldInclude) {
        // Set the correct time for this occurrence
        const occurrenceDate = new Date(currentDate);
        occurrenceDate.setHours(startHour, startMinute, startSecond, 0);
        const occurrenceEndDate = new Date(occurrenceDate.getTime() + durationMs);

        // Check if this occurrence falls within our target range
        if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
          // Check for exceptions
          const exception = event.exceptions.find((ex) =>
            isSameDay(ex.exceptionDate, occurrenceDate),
          );

          if (exception) {
            // Skip if it's a deleted occurrence
            if (exception.isDeleted) {
              currentDate.setDate(currentDate.getDate() + 1);
              continue;
            }

            // This is a modified occurrence, use the new times
            if (exception.newStartTime && exception.newEndTime) {
              occurrences.push({
                id: `${event.id}-${occurrenceDate.toISOString()}`,
                originalEventId: event.id,
                title: event.title,
                description: event.description,
                start: exception.newStartTime,
                end: exception.newEndTime,
                color: event.color,
                eventType: event.eventType,
                isRecurring: true,
                isException: true,
                exceptionId: exception.id,
                recurrence: {
                  pattern: event.recurrencePattern as RecurrencePattern,
                  daysOfWeek: event.recurrenceDays
                    ? event.recurrenceDays.split(',').map(Number)
                    : undefined,
                },
              });
            }
          } else {
            // Regular occurrence
            occurrences.push({
              id: `${event.id}-${occurrenceDate.toISOString()}`,
              originalEventId: event.id,
              title: event.title,
              description: event.description,
              start: occurrenceDate,
              end: occurrenceEndDate,
              color: event.color,
              eventType: event.eventType,
              isRecurring: true,
              isException: false,
              recurrence: {
                pattern: event.recurrencePattern as RecurrencePattern,
                daysOfWeek: event.recurrenceDays
                  ? event.recurrenceDays.split(',').map(Number)
                  : undefined,
              },
            });
          }
        }
      }

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return occurrences;
  }

  /**
   * Map a database Event to an EventOccurrence
   */
  private mapToEventOccurrence(event: Event): EventOccurrence {
    return {
      id: event.id,
      originalEventId: event.id,
      title: event.title,
      description: event.description,
      start: event.startTime,
      end: event.endTime,
      color: event.color,
      eventType: event.eventType,
      isRecurring: event.recurrencePattern !== 'None',
      isException: false,
      recurrence:
        event.recurrencePattern !== 'None'
          ? {
              pattern: event.recurrencePattern as RecurrencePattern,
              daysOfWeek: event.recurrenceDays
                ? event.recurrenceDays.split(',').map(Number)
                : undefined,
            }
          : undefined,
    };
  }
}
