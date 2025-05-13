// src/middlewares/validation.ts

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
// Define event types locally since they might not be exported from Prisma
enum EventType {
  WORK = 'Work',
  PERSONAL = 'Personal',
  MEETING = 'Meeting',
}

// Define recurrence types locally
enum RecurrenceType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

// Helper function to validate request data
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// Validators for event endpoints
export const eventValidators = {
  create: [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('startTime').isISO8601().withMessage('Start time must be a valid ISO date string'),
    body('endTime')
      .isISO8601()
      .withMessage('End time must be a valid ISO date string')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    body('type').isIn(Object.values(EventType)).withMessage('Invalid event type'),
    body('recurrenceType')
      .isIn(Object.values(RecurrenceType))
      .withMessage('Invalid recurrence type'),
    body('recurrenceRule.daysOfWeek')
      .optional()
      .isArray()
      .withMessage('Days of week must be an array')
      .custom((value) => {
        if (!Array.isArray(value)) return true;
        return value.every((day) => day >= 0 && day <= 6);
      })
      .withMessage('Days of week must be between 0 and 6'),
    body('recurrenceRule.endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date string'),
    body('recurrenceRule.count')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Count must be a positive integer'),
    validate,
  ],

  update: [
    param('id').isUUID().withMessage('Invalid event ID'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid ISO date string'),
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid ISO date string')
      .custom((value, { req }) => {
        if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    body('type').optional().isIn(Object.values(EventType)).withMessage('Invalid event type'),
    body('recurrenceType')
      .optional()
      .isIn(Object.values(RecurrenceType))
      .withMessage('Invalid recurrence type'),
    body('recurrenceRule.daysOfWeek')
      .optional()
      .isArray()
      .withMessage('Days of week must be an array')
      .custom((value) => {
        if (!Array.isArray(value)) return true;
        return value.every((day) => day >= 0 && day <= 6);
      })
      .withMessage('Days of week must be between 0 and 6'),
    body('recurrenceRule.endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO date string'),
    body('recurrenceRule.count')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Count must be a positive integer'),
    validate,
  ],

  getById: [param('id').isUUID().withMessage('Invalid event ID'), validate],

  delete: [param('id').isUUID().withMessage('Invalid event ID'), validate],

  getEvents: [
    query('startDate').isISO8601().withMessage('Start date must be a valid ISO date string'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO date string')
      .custom((value, { req }) => {
        if (
          req.query &&
          req.query.startDate &&
          new Date(value) < new Date(req.query.startDate as string)
        ) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    query('type').optional().isIn(Object.values(EventType)).withMessage('Invalid event type'),
    validate,
  ],

  updateSingleOccurrence: [
    param('id').isUUID().withMessage('Invalid event ID'),
    param('date').isISO8601().withMessage('Invalid date format'),
    body('newStartTime')
      .optional()
      .isISO8601()
      .withMessage('New start time must be a valid ISO date string'),
    body('newEndTime')
      .optional()
      .isISO8601()
      .withMessage('New end time must be a valid ISO date string')
      .custom((value, { req }) => {
        if (req.body.newStartTime && new Date(value) <= new Date(req.body.newStartTime)) {
          throw new Error('New end time must be after new start time');
        }
        return true;
      }),
    body('isDeleted').optional().isBoolean().withMessage('isDeleted must be a boolean'),
    validate,
  ],
};
