import { Request, Response, NextFunction } from 'express'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { 
  errorHandler, 
  ApiError, 
  NotFoundError, 
  ForbiddenError, 
  ValidationError,
  createApiError 
} from './errorHandler'

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {}
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    mockNext = jest.fn()
    
    jest.clearAllMocks()
  })

  describe('ApiError Classes', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Bad Request', 'Invalid input', 400)
      
      expect(error.error).toBe('Bad Request')
      expect(error.message).toBe('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('ApiError')
    })

    it('should create NotFoundError with default message', () => {
      const error = new NotFoundError()
      
      expect(error.error).toBe('Not Found')
      expect(error.message).toBe('Resource not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create NotFoundError with custom message', () => {
      const error = new NotFoundError('User not found')
      
      expect(error.error).toBe('Not Found')
      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
    })

    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError()
      
      expect(error.error).toBe('Forbidden')
      expect(error.message).toBe('Access denied')
      expect(error.statusCode).toBe(403)
    })

    it('should create ValidationError with default message', () => {
      const error = new ValidationError()
      
      expect(error.error).toBe('Validation Error')
      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(400)
    })
  })

  describe('createApiError helper', () => {
    it('should create ApiError with default status code', () => {
      const error = createApiError('Something went wrong')
      
      expect(error.error).toBe('Bad Request')
      expect(error.message).toBe('Something went wrong')
      expect(error.statusCode).toBe(400)
    })

    it('should create ApiError with custom status code', () => {
      const error = createApiError('Server error', 500)
      
      expect(error.error).toBe('Bad Request')
      expect(error.message).toBe('Server error')
      expect(error.statusCode).toBe(500)
    })
  })

  describe('errorHandler middleware', () => {
    it('should handle ApiError instances correctly', () => {
      const apiError = new ApiError('Bad Request', 'Invalid input', 400)
      
      errorHandler(apiError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid input'
      })
    })

    it('should handle NotFoundError correctly', () => {
      const notFoundError = new NotFoundError('User not found')
      
      errorHandler(notFoundError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'User not found'
      })
    })

    it('should handle ValidationError correctly', () => {
      const validationError = new ValidationError('Email is required')
      
      errorHandler(validationError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'Email is required'
      })
    })

    it('should handle mongoose ValidationError', () => {
      const mongooseError = new Error('Validation failed')
      mongooseError.name = 'ValidationError'
      
      errorHandler(mongooseError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'Validation failed'
      })
    })

    it('should handle JWT UnauthorizedError', () => {
      const jwtError = new Error('Access denied')
      jwtError.name = 'UnauthorizedError'
      
      errorHandler(jwtError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Access denied'
      })
    })

    it('should handle CastError (invalid ID)', () => {
      const castError = new Error('Invalid ObjectId')
      castError.name = 'CastError'
      
      errorHandler(castError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid ID',
        message: 'Invalid ObjectId'
      })
    })

    it('should handle generic errors with 500 status', () => {
      const genericError = new Error('Something went wrong')
      
      errorHandler(genericError, mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Something went wrong'
      })
    })

    it('should log errors to console', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const error = new Error('Test error')
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext)
      
      expect(consoleSpy).toHaveBeenCalledWith('Error:', error)
      consoleSpy.mockRestore()
    })
  })
})
