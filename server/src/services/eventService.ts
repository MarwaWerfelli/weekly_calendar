import { Event } from '@prisma/client';
import { isSameDay, startOfDay, getDay } from 'date-fns';
import { fromUTC, toUTC } from '../utils/dateUtils';
import { eventsConflict } from '../utils/recurrenceUtils';
import prisma from '../prismaClient';

// Define recurrence types as constants
export const RecurrenceType = {
  NONE: 'NONE',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
};

export interface EventWithExceptions extends Event {
  exceptions: {
    id: string;
    exceptionDate: Date;
    isDeleted: boolean;
    newStartTime: Date | null;
    newEndTime: Date | null;
  }[];
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface EventOccurrence {
  id: string;
  originalEventId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  color: string;
  eventType: string;
  timezone: string;
  isRecurring: boolean;
  isException: boolean;
  exceptionId?: string;
  userId?: string;
  userName?: string;
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
   * Get all events for a specific user and date range
   * If userId is not provided, returns events for all users
   */
  async getEventsByDateRange(
    userId: string | null,
    startDate: Date,
    endDate: Date,
    timezone: string = 'UTC',
  ): Promise<EventOccurrence[]> {
    // Get all events that might have occurrences in the date range
    const whereClause: any = {
      OR: [
        // Non-recurring events that fall within the date range
        {
          isRecurring: false,
          startTime: { lte: endDate },
          endTime: { gte: startDate },
        },
        // All recurring events (we'll filter their occurrences later)
        { isRecurring: true },
      ],
    };

    // Add userId filter if provided
    if (userId) {
      whereClause.userId = userId;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        exceptions: true,
        user: true, // Include user information
      },
    });

    // Generate all event occurrences within the date range
    const occurrences: EventOccurrence[] = [];

    for (const event of events) {
      if (!event.isRecurring) {
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
        timezone,
      );

      occurrences.push(...eventOccurrences);
    }

    return occurrences;
  }

  /**
   * Check if an event conflicts with any existing events
   */
  async checkEventConflicts(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string,
  ): Promise<boolean> {
    // Get all events that might conflict
    const events = await prisma.event.findMany({
      where: {
        userId,
        id: excludeEventId ? { not: excludeEventId } : undefined,
        OR: [
          // Non-recurring events that might conflict
          {
            isRecurring: false,
            AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
          },
          // We'll check recurring events separately
          { isRecurring: true },
        ],
      },
      include: {
        exceptions: true,
      },
    });

    // Check for conflicts with each event
    for (const event of events) {
      if (!event.isRecurring) {
        // Direct conflict check for non-recurring events
        if (eventsConflict(startTime, endTime, event.startTime, event.endTime)) {
          return true; // Conflict found
        }
      } else {
        // For recurring events, generate occurrences and check each one
        const occurrences = this.generateRecurringEventOccurrences(
          event as EventWithExceptions,
          new Date(startTime.getTime() - 24 * 60 * 60 * 1000), // 1 day before
          new Date(endTime.getTime() + 24 * 60 * 60 * 1000), // 1 day after
          event.timezone || 'UTC',
        );

        for (const occurrence of occurrences) {
          if (eventsConflict(startTime, endTime, occurrence.startTime, occurrence.endTime)) {
            return true; // Conflict found
          }
        }
      }
    }

    return false; // No conflicts
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    color: string;
    eventType: string;
    timezone: string;
    userId: string;
    isRecurring: boolean;
    recurrenceType?: string;
    recurrenceDays?: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday
  }): Promise<Event> {
    // Check for conflicts before creating
    const hasConflicts = await this.checkEventConflicts(
      eventData.userId,
      eventData.startTime,
      eventData.endTime,
    );

    if (hasConflicts) {
      throw new Error('Event conflicts with an existing event');
    }

    return prisma.event.create({
      data: {
        title: eventData.title,
        description: eventData.description || null,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        color: eventData.color,
        eventType: eventData.eventType,
        timezone: eventData.timezone || 'UTC',
        userId: eventData.userId,
        isRecurring: eventData.isRecurring,
        recurrenceType: eventData.recurrenceType || null,
        recurrenceDays: eventData.recurrenceDays ? eventData.recurrenceDays.join(',') : '',
      },
    });
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
      color?: string;
      eventType?: string;
      timezone?: string;
      isRecurring?: boolean;
      recurrenceType?: string | null;
      recurrenceDays?: number[];
    },
  ): Promise<Event> {
    // If updating times, check for conflicts
    if (eventData.startTime || eventData.endTime) {
      const existingEvent = await this.getEventById(eventId);
      if (!existingEvent) {
        throw new Error('Event not found');
      }

      const startTime = eventData.startTime || existingEvent.startTime;
      const endTime = eventData.endTime || existingEvent.endTime;

      // Check for conflicts with other events
      const hasConflicts = await this.checkEventConflicts(
        existingEvent.userId,
        startTime,
        endTime,
        eventId, // Exclude this event from conflict check
      );

      if (hasConflicts) {
        throw new Error('Event conflicts with an existing event');
      }
    }

    // Convert recurrenceDays array to string if provided
    const updateData: any = { ...eventData };
    if (updateData.recurrenceDays) {
      updateData.recurrenceDays = updateData.recurrenceDays.join(',');
    }

    return prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<Event> {
    return prisma.event.delete({
      where: { id: eventId },
    });
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
   * Check if a date is a valid occurrence of a recurring event
   */
  async isValidEventOccurrence(event: Event, date: Date): Promise<boolean> {
    if (!event.isRecurring || event.recurrenceType === RecurrenceType.NONE) {
      // For non-recurring events, check if the date matches the event date
      return isSameDay(event.startTime, date);
    }

    // Get the day of the week for the date
    const dayOfWeek = getDay(date); // 0=Sunday, 1=Monday, ... 6=Saturday

    // Check if this date should be included based on recurrence type
    if (event.recurrenceType === RecurrenceType.DAILY) {
      // For daily events, check if the date is on or after the start date
      return date >= startOfDay(event.startTime);
    } else if (event.recurrenceType === RecurrenceType.WEEKLY) {
      // For weekly events, check if the day of the week is included and the date is on or after the start date
      return (
        event.recurrenceDays &&
        event.recurrenceDays.split(',').map(Number).includes(dayOfWeek) &&
        date >= startOfDay(event.startTime)
      );
    }

    return false;
  }

  /**
   * Generate all occurrences of a recurring event within a date range
   */
  private generateRecurringEventOccurrences(
    event: EventWithExceptions,
    startDate: Date,
    endDate: Date,
    timezone: string = 'UTC',
  ): EventOccurrence[] {
    const occurrences: EventOccurrence[] = [];

    if (event.recurrenceType === RecurrenceType.NONE || !event.isRecurring) {
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
      if (event.recurrenceType === RecurrenceType.DAILY) {
        shouldInclude = true;
      } else if (
        event.recurrenceType === RecurrenceType.WEEKLY &&
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
                startTime: exception.newStartTime,
                endTime: exception.newEndTime,
                color: event.color,
                eventType: event.eventType,
                timezone: event.timezone || timezone,
                isRecurring: true,
                isException: true,
                exceptionId: exception.id,
                userId: event.userId,
                userName: event.user?.name,
              });
            }
          } else {
            // Regular occurrence
            occurrences.push({
              id: `${event.id}-${occurrenceDate.toISOString()}`,
              originalEventId: event.id,
              title: event.title,
              description: event.description,
              startTime: occurrenceDate,
              endTime: occurrenceEndDate,
              color: event.color,
              eventType: event.eventType,
              timezone: event.timezone || timezone,
              isRecurring: true,
              isException: false,
              userId: event.userId,
              userName: event.user?.name,
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
  private mapToEventOccurrence(event: any): EventOccurrence {
    return {
      id: event.id,
      originalEventId: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      eventType: event.eventType,
      timezone: event.timezone || 'UTC',
      isRecurring: event.isRecurring,
      isException: false,
      userId: event.userId,
      userName: event.user?.name,
    };
  }
}
