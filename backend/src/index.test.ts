import request from 'supertest'
import express from 'express'
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'

// Mock the services to avoid actual initialization during tests
jest.mock('./services/pushNotifications', () => ({
  setupPushNotifications: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('./services/medicationScheduler', () => ({
  setupMedicationScheduler: jest.fn().mockResolvedValue(undefined)
}))

// Import the app after mocking
let app: express.Application

beforeAll(async () => {
  // Import the app after all mocks are set up
  const { default: createApp } = await import('./index')
  app = createApp()
})

afterAll(async () => {
  // Clean up
  jest.clearAllMocks()
})

describe('Express App', () => {
  describe('GET /health', () => {
    it('should return health status and timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'OK')
      expect(response.body).toHaveProperty('timestamp')
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404)

      expect(response.body).toHaveProperty('error', 'Route not found')
    })
  })

  describe('CORS configuration', () => {
    it('should allow requests from frontend origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    })
  })

  describe('Rate limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      // Make multiple requests to trigger rate limiting
      const promises = Array.from({ length: 101 }, () =>
        request(app).get('/api/households')
      )

      const responses = await Promise.all(promises)
      const rateLimitedResponses = responses.filter(r => r.status === 429)

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })
})
