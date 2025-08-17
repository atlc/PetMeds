import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, HouseholdWithMembers } from '../types'
import { authApi, householdsApi } from '../services/api'

/**
 * Authentication context interface defining the shape of our auth context
 * Provides user data, households, loading state, and authentication methods
 */
interface AuthContextType {
  user: User | null
  households: HouseholdWithMembers[]
  loading: boolean
  login: (idToken: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

// Create the authentication context with undefined as initial value
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Custom hook to consume the authentication context
 * Throws an error if used outside of AuthProvider to ensure proper usage
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Props interface for the AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Authentication provider component that manages user authentication state
 * Handles Google OAuth login, token storage, and user data management
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State for current authenticated user
  const [user, setUser] = useState<User | null>(null)
  // State for user's households with member and pet information
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([])
  // Loading state for authentication operations
  const [loading, setLoading] = useState(true)

  /**
   * Effect hook to check for existing authentication token on component mount
   * If token exists, attempts to refresh user data; otherwise sets loading to false
   */
  useEffect(() => {
    const token = localStorage.getItem('petmeds_token')
    if (token) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [])

  /**
   * Handles Google OAuth login process
   * @param idToken - Google ID token from OAuth flow
   */
  const login = async (idToken: string) => {
    try {
      setLoading(true)
      // Send ID token to backend for verification
      const response = await authApi.googleLogin(idToken)
      
      // Store JWT token in localStorage for future requests
      localStorage.setItem('petmeds_token', response.data.token)
      
      // Update application state with user and household data
      setUser(response.data.user)
      setHouseholds(response.data.households)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles user logout by clearing all authentication data
   * Removes token from localStorage and resets application state
   */
  const logout = () => {
    // Clear JWT token from localStorage
    localStorage.removeItem('petmeds_token')
    // Reset user and household state
    setUser(null)
    setHouseholds([])
  }

  /**
   * Refreshes user data using stored authentication token
   * Called on app startup and when token needs validation
   */
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('petmeds_token')
      if (!token) {
        setLoading(false)
        return
      }

      // Fetch current user data from backend
      const response = await authApi.getCurrentUser()
      setUser(response.data.user)
      
      // Fetch updated household data for the user
      const householdsResponse = await householdsApi.getAll()
      setHouseholds(householdsResponse.data.households)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // If token is invalid, clear it and logout user
      logout()
    } finally {
      setLoading(false)
    }
  }

  // Context value object containing all authentication state and methods
  const value: AuthContextType = {
    user,
    households,
    loading,
    login,
    logout,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
