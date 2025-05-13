import { Request, Response } from 'express';
import { EventService, RecurrenceType } from '../services/eventService';
import { parseISO } from 'date-fns';
import { fromUTC, toUTC, getWeekBounds } from '../utils/dateUtils';

const eventService = new EventService();

export class EventController {
  /**
   * Get events for a week view
   */
  async getWeekEvents(req: Request, res: Response) {
    try {
      const userId = (req.query.userId as string) || null;

      // Get date from query or use current date
      let date = new Date();
      if (req.query.date) {
        date = parseISO(req.query.date as string);
      }

      // Get timezone from query or use UTC
      const timezone = (req.query.timezone as string) || 'UTC';

      // Get the start and end of the week with timezone consideration
      const { start, end } = getWeekBounds(date, timezone, 0); // 0 = Sunday

      const events = await eventService.getEventsByDateRange(userId, start, end, timezone);

      // Format the week range for display
      const formattedStart = fromUTC(start, timezone);
      const formattedEnd = fromUTC(end, timezone);

      return res.json({
        weekRange: {
          start: start.toISOString(),
          end: end.toISOString(),
          displayRange: `${formattedStart.toLocaleDateString()} - ${formattedEnd.toLocaleDateString()}`,
        },
        events,
      });
    } catch (error) {
      console.error('Error getting week events:', error);
      return res.status(500).json({ error: 'Failed to get events' });
    }
  }

  /**
   * Create a new event
   */
  async createEvent(req: Request, res: Response) {
    try {
      const {
        title,
        description,
        startTime,
        endTime,
        color,
        eventType,
        userId,
        isRecurring,
        recurrenceType,
        recurrenceDays,
        timezone = 'UTC',
      } = req.body;

      // Validate required fields
      if (!title || !startTime || !endTime || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Parse dates with timezone consideration
      const parsedStartTime = toUTC(startTime, timezone);
      const parsedEndTime = toUTC(endTime, timezone);

      // Validate dates
      if (parsedEndTime <= parsedStartTime) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // Validate recurrence data
      if (
        isRecurring &&
        recurrenceType === 'WEEKLY' &&
        (!recurrenceDays || recurrenceDays.length === 0)
      ) {
        return res
          .status(400)
          .json({ error: 'Weekly recurring events must specify at least one day of the week' });
      }

      // Set color based on event type if not explicitly provided
      let eventColor = color;
      if (!eventColor) {
        switch (eventType) {
          case 'Work':
            eventColor = 'blue';
            break;
          case 'Personal':
            eventColor = 'green';
            break;
          case 'Meeting':
            eventColor = 'orange';
            break;
          default:
            eventColor = 'blue';
        }
      }

      // Create the event
      const event = await eventService.createEvent({
        title,
        description,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        color: eventColor,
        eventType: eventType || 'Work',
        timezone,
        userId,
        isRecurring: isRecurring || false,
        recurrenceType: recurrenceType
          ? RecurrenceType[recurrenceType as keyof typeof RecurrenceType]
          : undefined,
        recurrenceDays: recurrenceDays || [],
      });

      return res.status(201).json(event);
    } catch (error) {
      console.error('Error creating event:', error);
      return res.status(500).json({ error: 'Failed to create event' });
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        startTime,
        endTime,
        color,
        eventType,
        isRecurring,
        recurrenceType,
        recurrenceDays,
        timezone,
      } = req.body;

      // Get the existing event to get its timezone if not provided
      const existingEvent = await eventService.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const eventTimezone = timezone || existingEvent.timezone || 'UTC';

      // Parse dates if provided with timezone consideration
      let parsedStartTime: Date | undefined;
      let parsedEndTime: Date | undefined;

      if (startTime) {
        parsedStartTime = toUTC(startTime, eventTimezone);
      }

      if (endTime) {
        parsedEndTime = toUTC(endTime, eventTimezone);
      }

      // Validate dates if both are provided
      if (parsedStartTime && parsedEndTime && parsedEndTime <= parsedStartTime) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }

      // Validate recurrence data
      if (
        isRecurring &&
        recurrenceType === 'WEEKLY' &&
        recurrenceDays &&
        recurrenceDays.length === 0
      ) {
        return res
          .status(400)
          .json({ error: 'Weekly recurring events must specify at least one day of the week' });
      }

      // Set color based on event type if changing event type but not color
      let eventColor = color;
      if (!eventColor && eventType && eventType !== existingEvent.eventType) {
        switch (eventType) {
          case 'Work':
            eventColor = 'blue';
            break;
          case 'Personal':
            eventColor = 'green';
            break;
          case 'Meeting':
            eventColor = 'orange';
            break;
        }
      }

      // Create the update data
      const updateData: any = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (parsedStartTime) updateData.startTime = parsedStartTime;
      if (parsedEndTime) updateData.endTime = parsedEndTime;
      if (eventColor) updateData.color = eventColor;
      if (eventType) updateData.eventType = eventType;
      if (timezone) updateData.timezone = timezone;
      if (isRecurring !== undefined) updateData.isRecurring = isRecurring;

      if (recurrenceType !== undefined) {
        updateData.recurrenceType = recurrenceType
          ? RecurrenceType[recurrenceType as keyof typeof RecurrenceType]
          : null;
      }

      if (recurrenceDays) {
        updateData.recurrenceDays = recurrenceDays;
      }

      // Update the event
      const updatedEvent = await eventService.updateEvent(id, updateData);

      return res.json(updatedEvent);
    } catch (error) {
      console.error('Error updating event:', error);
      return res.status(500).json({ error: 'Failed to update event' });
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deletedEvent = await eventService.deleteEvent(id);

      return res.json(deletedEvent);
    } catch (error) {
      console.error('Error deleting event:', error);
      return res.status(500).json({ error: 'Failed to delete event' });
    }
  }

  /**
   * Create an exception for a recurring event occurrence
   */
  async createEventException(req: Request, res: Response) {
    try {
      const { eventId } = req.params;
      const { exceptionDate, isDeleted = true, newStartTime, newEndTime, timezone } = req.body;

      if (!exceptionDate) {
        return res.status(400).json({ error: 'Exception date is required' });
      }

      // Get the event to get its timezone if not provided
      const event = await eventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!event.isRecurring) {
        return res.status(400).json({ error: 'Cannot create exception for non-recurring event' });
      }

      const eventTimezone = timezone || event.timezone || 'UTC';

      // Parse dates with timezone consideration
      const parsedExceptionDate = toUTC(exceptionDate, eventTimezone);
      let parsedNewStartTime: Date | undefined;
      let parsedNewEndTime: Date | undefined;

      if (!isDeleted) {
        // If this is a modified occurrence, we need valid start and end times
        if (!newStartTime || !newEndTime) {
          return res.status(400).json({
            error: 'New start and end times are required for modified occurrences',
          });
        }

        parsedNewStartTime = toUTC(newStartTime, eventTimezone);
        parsedNewEndTime = toUTC(newEndTime, eventTimezone);

        if (parsedNewEndTime <= parsedNewStartTime) {
          return res.status(400).json({ error: 'New end time must be after new start time' });
        }
      }

      // Check if the exception date is valid for this recurring event
      const isValidOccurrence = await eventService.isValidEventOccurrence(
        event,
        parsedExceptionDate,
      );

      if (!isValidOccurrence) {
        return res.status(400).json({
          error: 'The specified date is not a valid occurrence of this recurring event',
        });
      }

      const exception = await eventService.createEventException(
        eventId,
        parsedExceptionDate,
        isDeleted,
        parsedNewStartTime,
        parsedNewEndTime,
      );

      return res.status(201).json(exception);
    } catch (error) {
      console.error('Error creating event exception:', error);
      return res.status(500).json({ error: 'Failed to create event exception' });
    }
  }
}
