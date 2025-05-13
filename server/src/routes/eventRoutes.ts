import express from 'express';
import { EventController } from '../controllers/eventController';

const router = express.Router();
const eventController = new EventController();

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get events for a week view
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date to get week for (defaults to current date)
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *         description: Timezone (defaults to UTC)
 *     responses:
 *       200:
 *         description: List of events for the week
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 weekRange:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
 *                     displayRange:
 *                       type: string
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       originalEventId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       start:
 *                         type: string
 *                         format: date-time
 *                       end:
 *                         type: string
 *                         format: date-time
 *                       color:
 *                         type: string
 *                       eventType:
 *                         type: string
 *                       isRecurring:
 *                         type: boolean
 *                       isException:
 *                         type: boolean
 *                       recurrence:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           pattern:
 *                             type: string
 *                             enum: ['None', 'Daily', 'Weekly']
 *                           daysOfWeek:
 *                             type: array
 *                             items:
 *                               type: integer
 */
router.get('/', eventController.getWeekEvents.bind(eventController));

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startTime
 *               - endTime
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               eventType:
 *                 type: string
 *                 enum: [Work, Personal, Meeting]
 *               timezone:
 *                 type: string
 *               recurrence:
 *                 type: object
 *                 properties:
 *                   pattern:
 *                     type: string
 *                     enum: [None, Daily, Weekly]
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Invalid input
 */
router.post('/', eventController.createEvent.bind(eventController));

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               eventType:
 *                 type: string
 *                 enum: [Work, Personal, Meeting]
 *               timezone:
 *                 type: string
 *               recurrence:
 *                 type: object
 *                 properties:
 *                   pattern:
 *                     type: string
 *                     enum: [None, Daily, Weekly]
 *                   daysOfWeek:
 *                     type: array
 *                     items:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 6
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarEvent'
 *       404:
 *         description: Event not found
 */
router.put('/:id', eventController.updateEvent.bind(eventController));

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: Event not found
 */
router.delete('/:id', eventController.deleteEvent.bind(eventController));

/**
 * @swagger
 * /api/events/{eventId}/exceptions:
 *   post:
 *     summary: Create an exception for a recurring event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exceptionDate
 *             properties:
 *               exceptionDate:
 *                 type: string
 *                 format: date-time
 *               isDeleted:
 *                 type: boolean
 *                 default: true
 *               newStartTime:
 *                 type: string
 *                 format: date-time
 *               newEndTime:
 *                 type: string
 *                 format: date-time
 *               timezone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Exception created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecurrenceException'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/exceptions', eventController.createEventException.bind(eventController));

export default router;
