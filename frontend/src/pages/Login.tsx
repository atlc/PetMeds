import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Heart, PawPrint, Shield, Users } from 'lucide-react'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    google: any
  }
}

const Login = () => {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load Google OAuth script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id',
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-login-button'),
          {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 300,
          }
        )
      }
    }

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const handleCredentialResponse = async (response: any) => {
    try {
      setLoading(true)
      await login(response.credential)
      toast.success('Welcome to PetMeds!')
    } catch (error) {
      console.error('Login failed:', error)
      toast.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-primary-600 rounded-full flex items-center justify-center mb-6">
            <PawPrint className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PetMeds</h1>
          <p className="text-lg text-gray-600">Manage your pet's medications with ease</p>
        </div>

        {/* Login Card */}
        <div className="card">
          <div className="card-body">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome Back</h2>
                <p className="text-gray-600">Sign in to continue managing your pet's health</p>
              </div>

              {/* Google Login Button */}
              <div className="flex justify-center">
                <div id="google-login-button"></div>
              </div>

              {loading && (
                <div className="text-center">
                  <div className="inline-flex items-center px-4 py-2 text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                    Signing you in...
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Secure authentication with Google</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-success-600" />
                  <span className="text-sm text-gray-600">Your data is secure and private</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-primary-600" />
                  <span className="text-sm text-gray-600">Share with family and pet sitters</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Heart className="h-5 w-5 text-danger-600" />
                  <span className="text-sm text-gray-600">Never miss a medication dose</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  )
}

export default Login
