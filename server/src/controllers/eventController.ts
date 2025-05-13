import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { parseISO } from 'date-fns';
import { fromUTC, toUTC, getWeekBounds } from '../utils/dateUtils';
import { EVENT_COLORS, EVENT_TYPES, RecurrencePattern } from '../models/type';

const eventService = new EventService();

export class EventController {
  /**
   * Get events for a week view
   */
  async getWeekEvents(req: Request, res: Response) {
    try {
      // Get date from query or use current date
      let date = new Date();
      if (req.query.date) {
        date = parseISO(req.query.date as string);
      }

      // Get timezone from query or use UTC
      const timezone = (req.query.timezone as string) || 'UTC';

      // Get the start and end of the week with timezone consideration
      const { start, end } = getWeekBounds(date, timezone, 0); // 0 = Sunday

      const events = await eventService.getEventsByDateRange(start, end);

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
        eventType,
        recurrence,
        timezone = 'UTC',
      } = req.body;

      // Validate required fields
      if (!title || !startTime || !endTime) {
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
        recurrence?.pattern === 'Weekly' &&
        (!recurrence.daysOfWeek || recurrence.daysOfWeek.length === 0)
      ) {
        return res
          .status(400)
          .json({ error: 'Weekly recurring events must specify at least one day of the week' });
      }

      // Create the event
      const event = await eventService.createEvent({
        title,
        description,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        eventType: eventType || EVENT_TYPES.WORK,
        recurrencePattern: recurrence?.pattern || 'None',
        recurrenceDays: recurrence?.daysOfWeek || [],
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
      const { title, description, startTime, endTime, eventType, recurrence, timezone } = req.body;

      // Get the existing event
      const existingEvent = await eventService.getEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const eventTimezone = timezone || 'UTC';

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
        recurrence?.pattern === 'Weekly' &&
        recurrence.daysOfWeek &&
        recurrence.daysOfWeek.length === 0
      ) {
        return res
          .status(400)
          .json({ error: 'Weekly recurring events must specify at least one day of the week' });
      }

      // Create the update data
      const updateData: any = {};
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (parsedStartTime) updateData.startTime = parsedStartTime;
      if (parsedEndTime) updateData.endTime = parsedEndTime;
      if (eventType) updateData.eventType = eventType;

      if (recurrence) {
        updateData.recurrencePattern = recurrence.pattern;
        if (recurrence.daysOfWeek) {
          updateData.recurrenceDays = recurrence.daysOfWeek;
        }
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

      const success = await eventService.deleteEvent(id);

      return res.json({ success });
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

      // Get the event
      const event = await eventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.recurrencePattern === 'None') {
        return res.status(400).json({ error: 'Cannot create exception for non-recurring event' });
      }

      const eventTimezone = timezone || 'UTC';

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
