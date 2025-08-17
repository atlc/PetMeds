import { Request, Response, NextFunction } from 'express'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { authMiddleware, optionalAuthMiddleware } from './auth'
import { createTestToken } from '../test/utils'

// Mock the database connection
jest.mock('../db/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}))

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }
    mockNext = jest.fn()
    
    // Set test environment
    process.env.JWT_SECRET = 'test-secret'
    
    jest.clearAllMocks()
  })

  describe('authMiddleware', () => {
    it('should return 401 when no authorization header is provided', async () => {
      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers = { authorization: 'InvalidToken' }

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 500 when JWT_SECRET is not configured', async () => {
      delete process.env.JWT_SECRET
      mockReq.headers = { authorization: 'Bearer valid-token' }

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when token is invalid', async () => {
      const { verify } = require('jsonwebtoken')
      verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      mockReq.headers = { authorization: 'Bearer invalid-token' }

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when token is expired', async () => {
      const { verify } = require('jsonwebtoken')
      const TokenExpiredError = class extends Error {
        name = 'TokenExpiredError'
      }
      verify.mockImplementation(() => {
        throw new TokenExpiredError('Token expired')
      })

      mockReq.headers = { authorization: 'Bearer expired-token' }

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 when user is not found in database', async () => {
      const { verify } = require('jsonwebtoken')
      const { pool } = require('../db/connection')

      verify.mockReturnValue({ userId: '1' })
      pool.query.mockResolvedValue({ rows: [] })

      mockReq.headers = { authorization: 'Bearer valid-token' }

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token. User not found.'
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should set user in request and call next when token is valid', async () => {
      const { verify } = require('jsonwebtoken')
      const { pool } = require('../db/connection')

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        image_url: 'https://example.com/avatar.jpg',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date()
      }

      verify.mockReturnValue({ userId: '1' })
      pool.query.mockResolvedValue({ rows: [mockUser] })

      mockReq.headers = { authorization: 'Bearer valid-token' }

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual(mockUser)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })
  })

  describe('optionalAuthMiddleware', () => {
    it('should call next without user when no authorization header is provided', async () => {
      await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should call next without user when JWT_SECRET is not configured', async () => {
      delete process.env.JWT_SECRET
      mockReq.headers = { authorization: 'Bearer valid-token' }

      await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should set user in request and call next when token is valid', async () => {
      const { verify } = require('jsonwebtoken')
      const { pool } = require('../db/connection')

      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        image_url: 'https://example.com/avatar.jpg',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date()
      }

      verify.mockReturnValue({ userId: '1' })
      pool.query.mockResolvedValue({ rows: [mockUser] })

      mockReq.headers = { authorization: 'Bearer valid-token' }

      await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toEqual(mockUser)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should call next without user when token is invalid', async () => {
      const { verify } = require('jsonwebtoken')
      verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      mockReq.headers = { authorization: 'Bearer invalid-token' }

      await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.user).toBeUndefined()
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })
  })
})
