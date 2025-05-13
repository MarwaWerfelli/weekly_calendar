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
        User: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            id: {
              type: 'string',
              description: 'Auto-generated UUID',
            },
            name: {
              type: 'string',
            },
            email: {
              type: 'string',
              format: 'email',
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
        Event: {
          type: 'object',
          required: ['title', 'startTime', 'endTime', 'userId'],
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
            startTime: {
              type: 'string',
              format: 'date-time',
            },
            endTime: {
              type: 'string',
              format: 'date-time',
            },
            color: {
              type: 'string',
              default: 'blue',
              enum: ['blue', 'green', 'orange'],
            },
            eventType: {
              type: 'string',
              default: 'Work',
              enum: ['Work', 'Personal', 'Meeting'],
            },
            timezone: {
              type: 'string',
              default: 'UTC',
            },
            userId: {
              type: 'string',
            },
            isRecurring: {
              type: 'boolean',
              default: false,
            },
            recurrenceType: {
              type: 'string',
              enum: ['NONE', 'DAILY', 'WEEKLY'],
              nullable: true,
            },
            recurrenceDays: {
              type: 'string',
              description: 'Comma-separated list of days (0=Sunday, 1=Monday, ... 6=Saturday)',
              default: '',
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
