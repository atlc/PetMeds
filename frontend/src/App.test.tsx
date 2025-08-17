import { describe, it, expect, vi } from 'vitest'
import { render, screen } from './test/utils'
import App from './App'

// Mock the useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn()
}))

// Mock the components to simplify testing
vi.mock('./components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}))

vi.mock('./pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>
}))

vi.mock('./pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard Page</div>
}))

vi.mock('./components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  )
}))

describe('App', () => {
  it('renders loading spinner when loading', () => {
    const { useAuth } = require('./hooks/useAuth')
    useAuth.mockReturnValue({ user: null, loading: true })

    render(<App />)
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders login page when not authenticated', () => {
    const { useAuth } = require('./hooks/useAuth')
    useAuth.mockReturnValue({ user: null, loading: false })

    render(<App />)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('renders dashboard when authenticated', () => {
    const { useAuth } = require('./hooks/useAuth')
    useAuth.mockReturnValue({ 
      user: { id: '1', email: 'test@example.com' }, 
      loading: false 
    })

    render(<App />)
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
    expect(screen.getByTestId('layout')).toBeInTheDocument()
  })
})
