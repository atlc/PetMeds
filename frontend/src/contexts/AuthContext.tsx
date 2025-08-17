import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, HouseholdWithMembers } from '../types'
import { authApi, householdsApi } from '../services/api'

interface AuthContextType {
  user: User | null
  households: HouseholdWithMembers[]
  loading: boolean
  login: (idToken: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [households, setHouseholds] = useState<HouseholdWithMembers[]>([])
  const [loading, setLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('petmeds_token')
    if (token) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (idToken: string) => {
    try {
      setLoading(true)
      const response = await authApi.googleLogin(idToken)
      
      // Store token
      localStorage.setItem('petmeds_token', response.data.token)
      
      // Update state
      setUser(response.data.user)
      setHouseholds(response.data.households)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    // Clear token and state
    localStorage.removeItem('petmeds_token')
    setUser(null)
    setHouseholds([])
  }

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('petmeds_token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await authApi.getCurrentUser()
      
      setUser(response.data.user)
      
      // Get updated households
      const householdsResponse = await householdsApi.getAll()
      setHouseholds(householdsResponse.data.households)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // Token might be invalid, clear it
      logout()
    } finally {
      setLoading(false)
    }
  }

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
