import { Request, Response, NextFunction } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import logger from '../config/logger';
import { env } from '../config/env';

// Custom error class for application errors
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler
export const errorHandler = (err: Error, _: Request, res: Response, __: NextFunction) => {
  // Prisma specific errors
  if (err instanceof PrismaClientKnownRequestError) {
    // Handle specific Prisma errors
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({
          status: 'error',
          message: 'A record with this information already exists',
        });
      case 'P2025': // Record not found
        return res.status(404).json({
          status: 'error',
          message: 'Record not found',
        });
      default:
        logger.error({ err }, 'Prisma error');
        return res.status(500).json({
          status: 'error',
          message: 'Database error',
        });
    }
  }

  if (err instanceof PrismaClientValidationError) {
    logger.error({ err }, 'Prisma validation error');
    return res.status(400).json({
      status: 'error',
      message: 'Invalid input data',
    });
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Log all unexpected errors
  logger.error({ err }, 'Unexpected error');

  // Generic error response
  const statusCode = (err as AppError).statusCode || 500;
  const message = (err as AppError).message || 'Something went wrong';

  // In production, don't expose error details for 500 errors
  const responseMessage =
    statusCode === 500 && env.NODE_ENV === 'production' ? 'Internal server error' : message;

  return res.status(statusCode).json({
    status: 'error',
    message: responseMessage,
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
