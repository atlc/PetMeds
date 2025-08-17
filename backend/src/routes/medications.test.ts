import request from 'supertest'
import express from 'express'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { medicationRoutes } from './medications'
import { createTestToken, mockUser, mockMedication } from '../test/utils'

// Mock the database connection
jest.mock('../db/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ userId: '1', email: 'test@example.com' })
}))

const app = express()
app.use(express.json())
app.use('/api/medications', medicationRoutes)

describe('Medication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/medications', () => {
    it('should return medications for authenticated user', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: [mockMedication]
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('medications')
      expect(response.body.medications).toHaveLength(1)
      expect(response.body.medications[0].name).toBe('Heartgard')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/medications')
        .expect(401)

      expect(response.body.error).toBe('Access denied. No token provided.')
    })
  })

  describe('POST /api/medications', () => {
    it('should create a new medication', async () => {
      const { pool } = require('../db/connection')
      const newMedication = {
        id: '2',
        name: 'Frontline',
        dosage: '1 application',
        frequency: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        petId: '1',
        householdId: '1',
        instructions: 'Apply to back of neck',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      pool.query
        .mockResolvedValueOnce({ rows: [newMedication] }) // Insert medication
        .mockResolvedValueOnce({ rows: [newMedication] }) // Get created medication

      const token = createTestToken()
      const medicationData = {
        name: 'Frontline',
        dosage: '1 application',
        frequency: 'monthly',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        petId: '1',
        householdId: '1',
        instructions: 'Apply to back of neck'
      }

      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send(medicationData)
        .expect(201)

      expect(response.body).toHaveProperty('medication')
      expect(response.body.medication.name).toBe('Frontline')
      expect(response.body.medication.frequency).toBe('monthly')
    })

    it('should return 400 when required fields are missing', async () => {
      const token = createTestToken()
      const invalidMedicationData = {
        name: 'Frontline',
        // Missing required fields
      }

      const response = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidMedicationData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/medications/:id', () => {
    it('should return a specific medication', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: [mockMedication]
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/medications/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('medication')
      expect(response.body.medication.id).toBe('1')
      expect(response.body.medication.name).toBe('Heartgard')
    })

    it('should return 404 when medication is not found', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/medications/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PUT /api/medications/:id', () => {
    it('should update an existing medication', async () => {
      const { pool } = require('../db/connection')
      const updatedMedication = {
        ...mockMedication,
        dosage: '2 tablets',
        instructions: 'Give with food and water'
      }

      pool.query
        .mockResolvedValueOnce({ rows: [mockMedication] }) // Check if medication exists
        .mockResolvedValueOnce({ rows: [updatedMedication] }) // Update medication

      const token = createTestToken()
      const updateData = {
        dosage: '2 tablets',
        instructions: 'Give with food and water'
      }

      const response = await request(app)
        .put('/api/medications/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('medication')
      expect(response.body.medication.dosage).toBe('2 tablets')
      expect(response.body.medication.instructions).toBe('Give with food and water')
    })

    it('should return 404 when medication is not found', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .put('/api/medications/999')
        .set('Authorization', `Bearer ${token}`)
        .send({ dosage: 'Updated' })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/medications/:id', () => {
    it('should delete an existing medication', async () => {
      const { pool } = require('../db/connection')
      pool.query
        .mockResolvedValueOnce({ rows: [mockMedication] }) // Check if medication exists
        .mockResolvedValueOnce({ rows: [] }) // Delete medication

      const token = createTestToken()

      const response = await request(app)
        .delete('/api/medications/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('deleted')
    })

    it('should return 404 when medication is not found', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .delete('/api/medications/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/medications/pet/:petId', () => {
    it('should return medications for a specific pet', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: [mockMedication]
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/medications/pet/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('medications')
      expect(response.body.medications).toHaveLength(1)
      expect(response.body.medications[0].petId).toBe('1')
    })

    it('should return empty array when pet has no medications', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/medications/pet/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('medications')
      expect(response.body.medications).toHaveLength(0)
    })
  })
})
