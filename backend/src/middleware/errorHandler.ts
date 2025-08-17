import { Request, Response, NextFunction } from 'express';

/**
 * Base API error class for consistent error handling
 * Extends the built-in Error class with additional properties for HTTP responses
 */
export class ApiError extends Error {
  constructor(
    public error: string,        // Error category/type (e.g., "Bad Request", "Not Found")
    public message: string,      // Human-readable error message
    public statusCode: number    // HTTP status code for the response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Error for when a requested resource is not found
 * Used for 404 responses when entities don't exist
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super('Not Found', message, 404);
  }
}

/**
 * Error for when access is denied to a resource
 * Used for 403 responses when user lacks permission
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied') {
    super('Forbidden', message, 403);
  }
}

/**
 * Error for when request data is invalid
 * Used for 400 responses when validation fails
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed') {
    super('Validation Error', message, 400);
  }
}

/**
 * Helper function to create API errors with consistent structure
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (defaults to 400)
 * @returns Configured ApiError instance
 */
export const createApiError = (message: string, statusCode: number = 400): ApiError => {
  return new ApiError('Bad Request', message, statusCode);
};

/**
 * Global error handling middleware
 * Catches all errors thrown in the application and formats them for HTTP responses
 * 
 * @param error - The error that was thrown
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // If it's already an API error, use its properties directly
  if ('statusCode' in error) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message
    });
  }

  // Handle specific error types from external libraries
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied'
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'The provided ID is not valid'
    });
  }

  // Default error response for unhandled errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
};
