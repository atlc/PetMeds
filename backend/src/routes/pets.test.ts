import request from 'supertest'
import express from 'express'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { petRoutes } from './pets'
import { createTestToken, mockUser, mockPet } from '../test/utils'

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
app.use('/api/pets', petRoutes)

describe('Pet Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/pets', () => {
    it('should return pets for authenticated user', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: [mockPet]
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('pets')
      expect(response.body.pets).toHaveLength(1)
      expect(response.body.pets[0].name).toBe('Buddy')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/pets')
        .expect(401)

      expect(response.body.error).toBe('Access denied. No token provided.')
    })
  })

  describe('POST /api/pets', () => {
    it('should create a new pet', async () => {
      const { pool } = require('../db/connection')
      const newPet = {
        id: '2',
        name: 'Fluffy',
        species: 'Cat',
        breed: 'Persian',
        birthDate: '2021-01-01',
        weight: 4.5,
        householdId: '1',
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      pool.query
        .mockResolvedValueOnce({ rows: [newPet] }) // Insert pet
        .mockResolvedValueOnce({ rows: [newPet] }) // Get created pet

      const token = createTestToken()
      const petData = {
        name: 'Fluffy',
        species: 'Cat',
        breed: 'Persian',
        birthDate: '2021-01-01',
        weight: 4.5,
        householdId: '1'
      }

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send(petData)
        .expect(201)

      expect(response.body).toHaveProperty('pet')
      expect(response.body.pet.name).toBe('Fluffy')
      expect(response.body.pet.species).toBe('Cat')
    })

    it('should return 400 when required fields are missing', async () => {
      const token = createTestToken()
      const invalidPetData = {
        name: 'Fluffy',
        // Missing required fields
      }

      const response = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidPetData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/pets/:id', () => {
    it('should return a specific pet', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: [mockPet]
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/pets/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('pet')
      expect(response.body.pet.id).toBe('1')
      expect(response.body.pet.name).toBe('Buddy')
    })

    it('should return 404 when pet is not found', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .get('/api/pets/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PUT /api/pets/:id', () => {
    it('should update an existing pet', async () => {
      const { pool } = require('../db/connection')
      const updatedPet = {
        ...mockPet,
        name: 'Buddy Updated',
        weight: 26.0
      }

      pool.query
        .mockResolvedValueOnce({ rows: [mockPet] }) // Check if pet exists
        .mockResolvedValueOnce({ rows: [updatedPet] }) // Update pet

      const token = createTestToken()
      const updateData = {
        name: 'Buddy Updated',
        weight: 26.0
      }

      const response = await request(app)
        .put('/api/pets/1')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toHaveProperty('pet')
      expect(response.body.pet.name).toBe('Buddy Updated')
      expect(response.body.pet.weight).toBe(26.0)
    })

    it('should return 404 when pet is not found', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .put('/api/pets/999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('DELETE /api/pets/:id', () => {
    it('should delete an existing pet', async () => {
      const { pool } = require('../db/connection')
      pool.query
        .mockResolvedValueOnce({ rows: [mockPet] }) // Check if pet exists
        .mockResolvedValueOnce({ rows: [] }) // Delete pet

      const token = createTestToken()

      const response = await request(app)
        .delete('/api/pets/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('deleted')
    })

    it('should return 404 when pet is not found', async () => {
      const { pool } = require('../db/connection')
      pool.query.mockResolvedValue({
        rows: []
      })

      const token = createTestToken()

      const response = await request(app)
        .delete('/api/pets/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })
})
