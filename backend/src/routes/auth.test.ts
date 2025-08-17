import request from 'supertest'
import express from 'express'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { authRoutes } from './auth'
import { createTestToken } from '../test/utils'

// Mock the database connection
jest.mock('../db/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock Google OAuth client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}))

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: '1', email: 'test@example.com' })
}))

const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /auth/google', () => {
    it('should return 400 when id_token is missing', async () => {
      const response = await request(app)
        .post('/auth/google')
        .send({})
        .expect(400)

      expect(response.body.error).toBe('ID token is required')
    })

    it('should return 400 when id_token is invalid', async () => {
      const { OAuth2Client } = require('google-auth-library')
      const mockClient = new OAuth2Client()
      mockClient.verifyIdToken.mockRejectedValue(new Error('Invalid token'))

      const response = await request(app)
        .post('/auth/google')
        .send({ id_token: 'invalid-token' })
        .expect(400)

      expect(response.body.error).toBe('Invalid ID token')
    })

    it('should create new user when user does not exist', async () => {
      const { OAuth2Client } = require('google-auth-library')
      const { pool } = require('../db/connection')
      
      const mockClient = new OAuth2Client()
      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'newuser@example.com',
          name: 'New User',
          picture: 'https://example.com/avatar.jpg'
        })
      })

      // Mock user not found
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // User query
        .mockResolvedValueOnce({ // Insert new user
          rows: [{
            id: '1',
            name: 'New User',
            email: 'newuser@example.com',
            image_url: 'https://example.com/avatar.jpg',
            timezone: 'UTC'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Households query

      const response = await request(app)
        .post('/auth/google')
        .send({ id_token: 'valid-token' })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('newuser@example.com')
    })

    it('should return existing user when user exists', async () => {
      const { OAuth2Client } = require('google-auth-library')
      const { pool } = require('../db/connection')
      
      const mockClient = new OAuth2Client()
      mockClient.verifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'existing@example.com',
          name: 'Existing User',
          picture: 'https://example.com/avatar.jpg'
        })
      })

      // Mock existing user
      pool.query
        .mockResolvedValueOnce({ // User query
          rows: [{
            id: '1',
            name: 'Existing User',
            email: 'existing@example.com',
            image_url: 'https://example.com/avatar.jpg',
            timezone: 'UTC'
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // Households query

      const response = await request(app)
        .post('/auth/google')
        .send({ id_token: 'valid-token' })
        .expect(200)

      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('existing@example.com')
    })
  })

  describe('GET /auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const { pool } = require('../db/connection')
      
      pool.query.mockResolvedValue({
        rows: [{
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          image_url: 'https://example.com/avatar.jpg',
          timezone: 'UTC'
        }]
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('test@example.com')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401)

      expect(response.body.error).toBe('Access token required')
    })
  })
})
