import { Express } from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Mock data for testing
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  googleId: 'google123',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockHousehold = {
  id: '1',
  name: 'Test Household',
  ownerId: '1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockPet = {
  id: '1',
  name: 'Buddy',
  species: 'Dog',
  breed: 'Golden Retriever',
  birthDate: '2020-01-01',
  weight: 25.5,
  householdId: '1',
  photoUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockMedication = {
  id: '1',
  name: 'Heartgard',
  dosage: '1 tablet',
  frequency: 'monthly',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  petId: '1',
  householdId: '1',
  instructions: 'Give with food',
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Helper function to create a test JWT token
export const createTestToken = (user: any = mockUser): string => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  )
}

// Helper function to make authenticated requests
export const authenticatedRequest = (app: Express, token?: string) => {
  const authToken = token || createTestToken()
  return request(app)
    .set('Authorization', `Bearer ${authToken}`)
}

// Helper function to make unauthenticated requests
export const unauthenticatedRequest = (app: Express) => {
  return request(app)
}

// Mock database functions
export const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
}

// Mock push notification functions
export const mockPushNotifications = {
  sendNotification: jest.fn(),
  setupPushNotifications: jest.fn(),
}

// Mock medication scheduler functions
export const mockMedicationScheduler = {
  scheduleMedication: jest.fn(),
  cancelMedication: jest.fn(),
  setupMedicationScheduler: jest.fn(),
}
