import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AuthProvider } from './contexts/AuthContext'
import { PushNotificationProvider } from './contexts/PushNotificationContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Households from './pages/Households'
import Pets from './pages/Pets'
import Medications from './pages/Medications'
import Agenda from './pages/Agenda'
import Settings from './pages/Settings'
import LoadingSpinner from './components/LoadingSpinner'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/households" element={<Households />} />
        <Route path="/pets" element={<Pets />} />
        <Route path="/medications" element={<Medications />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <PushNotificationProvider>
        <AppRoutes />
      </PushNotificationProvider>
    </AuthProvider>
  )
}

export default App
