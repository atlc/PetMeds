import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  constructor(
    public error: string,
    public message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super('Not Found', message, 404);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied') {
    super('Forbidden', message, 403);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed') {
    super('Validation Error', message, 400);
  }
}

export const createApiError = (message: string, statusCode: number = 400): ApiError => {
  return new ApiError('Bad Request', message, statusCode);
};

export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  // If it's already an API error, use it
  if ('statusCode' in error) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message
    });
  }

  // Handle specific error types
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

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
};
