import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { PushNotificationProvider } from '../contexts/PushNotificationContext'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PushNotificationProvider>
            {children}
          </PushNotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Mock data for testing
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  googleId: 'google123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockHousehold = {
  id: '1',
  name: 'Test Household',
  ownerId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
