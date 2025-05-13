import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Weekly Calendar API',
      version: '1.0.0',
      description: 'API documentation for the Weekly Calendar application',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        CalendarEvent: {
          type: 'object',
          required: ['title', 'start', 'end', 'eventType'],
          properties: {
            id: {
              type: 'string',
              description: 'Auto-generated UUID',
            },
            title: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            start: {
              type: 'string',
              format: 'date-time',
            },
            end: {
              type: 'string',
              format: 'date-time',
            },
            color: {
              type: 'string',
              description: 'Color code for the event (e.g., #4285F4)',
            },
            eventType: {
              type: 'string',
              enum: ['Work', 'Personal', 'Meeting'],
            },
            recurrence: {
              type: 'object',
              nullable: true,
              properties: {
                pattern: {
                  type: 'string',
                  enum: ['None', 'Daily', 'Weekly'],
                },
                daysOfWeek: {
                  type: 'array',
                  items: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 6,
                  },
                  description:
                    'Days of week for weekly recurrence (0=Sunday, 1=Monday, ... 6=Saturday)',
                },
              },
            },
          },
        },
        RecurrenceException: {
          type: 'object',
          required: ['eventId', 'exceptionDate'],
          properties: {
            id: {
              type: 'string',
              description: 'Auto-generated UUID',
            },
            eventId: {
              type: 'string',
            },
            exceptionDate: {
              type: 'string',
              format: 'date-time',
            },
            isDeleted: {
              type: 'boolean',
              default: true,
            },
            newStartTime: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            newEndTime: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
}
