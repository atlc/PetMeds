import { useAuth } from '../hooks/useAuth'
import { useQuery } from 'react-query'
import { agendaApi } from '../services/api'
import { 
  Users, 
  PawPrint, 
  Pill, 
  Clock, 
  AlertTriangle,
  Plus,
  Calendar
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

const Dashboard = () => {
  const { user, households } = useAuth()

  // Get today's agenda for all households
  const { data: agendaData, isLoading: agendaLoading } = useQuery(
    ['agenda', 'today'],
    async () => {
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)

      const allAgendaItems = []
      for (const household of households) {
        try {
          const response = await agendaApi.getAgenda({
            household_id: household.id,
            start_date: startOfDay.toISOString(),
            end_date: endOfDay.toISOString()
          })
          allAgendaItems.push(...response.data.items)
        } catch (error) {
          console.error(`Failed to get agenda for household ${household.id}:`, error)
        }
      }
      return allAgendaItems
    },
    {
      enabled: households.length > 0,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  )

  const dueMedications = agendaData?.filter(item => item.status === 'due') || []
  const overdueMedications = agendaData?.filter(item => 
    item.status === 'due' && new Date(item.scheduled_time) < new Date()
  ) || []

  const stats = [
    {
      name: 'Households',
      value: households.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/households'
    },
    {
      name: 'Total Pets',
      value: households.reduce((acc, h) => acc + h.pets.length, 0),
      icon: PawPrint,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/pets'
    },
    {
      name: 'Due Today',
      value: dueMedications.length,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/agenda'
    },
    {
      name: 'Overdue',
      value: overdueMedications.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      href: '/agenda'
    }
  ]

  if (households.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to PetMeds!</h1>
          <p className="text-lg text-gray-600">Get started by creating your first household</p>
        </div>

        <div className="card max-w-md mx-auto">
          <div className="card-body text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No households yet</h3>
            <p className="text-gray-600 mb-6">
              Create a household to start managing your pets and their medications
            </p>
            <Link to="/households" className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Household
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-lg text-gray-600">
          Welcome back, {user?.name}! Here's what's happening with your pets today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Household Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Households */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Your Households</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {households.map((household) => (
                <div key={household.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{household.name}</h4>
                    <p className="text-sm text-gray-600">
                      {household.pets.length} pets • {household.members.length} members
                    </p>
                  </div>
                  <Link
                    to={`/households/${household.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link to="/households" className="btn-secondary w-full">
                <Plus className="h-4 w-4 mr-2" />
                Manage Households
              </Link>
            </div>
          </div>
        </div>

        {/* Today's Agenda */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Today's Medications</h3>
            <p className="text-sm text-gray-600">{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <div className="card-body">
            {agendaLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading agenda...</p>
              </div>
            ) : dueMedications.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No medications due today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dueMedications.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.pet.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.medication.name} • {item.medication.dosage_amount} {item.medication.dosage_unit}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {format(new Date(item.scheduled_time), 'h:mm a')}
                    </span>
                  </div>
                ))}
                {dueMedications.length > 5 && (
                  <p className="text-sm text-gray-600 text-center">
                    +{dueMedications.length - 5} more medications today
                  </p>
                )}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link to="/agenda" className="btn-secondary w-full">
                <Calendar className="h-4 w-4 mr-2" />
                View Full Agenda
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/pets" className="btn-secondary">
              <PawPrint className="h-4 w-4 mr-2" />
              Add Pet
            </Link>
            <Link to="/medications" className="btn-secondary">
              <Pill className="h-4 w-4 mr-2" />
              Add Medication
            </Link>
            <Link to="/agenda" className="btn-secondary">
              <Calendar className="h-4 w-4 mr-2" />
              View Schedule
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
