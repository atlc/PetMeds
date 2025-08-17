import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from './useAuth'
import { AuthContext } from '../contexts/AuthContext'

describe('useAuth Hook', () => {
  it('should return auth context when used within AuthProvider', () => {
    const mockAuthContext = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn()
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toEqual(mockAuthContext.user)
    expect(result.current.loading).toBe(false)
    expect(result.current.login).toBeDefined()
    expect(result.current.logout).toBeDefined()
    expect(result.current.updateUser).toBeDefined()
  })

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })

  it('should handle undefined context value', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={undefined as any}>
        {children}
      </AuthContext.Provider>
    )

    expect(() => {
      renderHook(() => useAuth(), { wrapper })
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('should return loading state correctly', () => {
    const mockAuthContext = {
      user: null,
      loading: true,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn()
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('should return null user when not authenticated', () => {
    const mockAuthContext = {
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn()
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(false)
  })
})
