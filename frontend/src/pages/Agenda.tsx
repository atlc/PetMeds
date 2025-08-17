import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { agendaApi, medicationsApi } from '../services/api'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Snooze
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format, addDays, startOfDay, endOfDay } from 'date-fns'

const Agenda = () => {
  const { households } = useAuth()
  const queryClient = useQueryClient()
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedDose, setSelectedDose] = useState<any>(null)
  const [logFormData, setLogFormData] = useState({
    administration_time: '',
    amount_given: '',
    note: ''
  })

  const { data: agendaData, isLoading } = useQuery(
    ['agenda', selectedHousehold?.id, selectedDate],
    () => {
      if (!selectedHousehold) return Promise.resolve({ items: [] })
      
      const startDate = startOfDay(selectedDate)
      const endDate = endOfDay(selectedDate)
      
      return agendaApi.getAgenda({
        household_id: selectedHousehold.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
    },
    {
      enabled: !!selectedHousehold,
      refetchOnWindowFocus: false,
    }
  )

  const logDoseMutation = useMutation(
    (data: { medicationId: string; logData: any }) => 
      medicationsApi.logDose(data.medicationId, data.logData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['agenda', selectedHousehold?.id, selectedDate])
        setShowLogModal(false)
        setSelectedDose(null)
        setLogFormData({ administration_time: '', amount_given: '', note: '' })
        toast.success('Dose logged successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to log dose')
      }
    }
  )

  const snoozeDoseMutation = useMutation(
    (doseId: string) => agendaApi.snoozeDose(doseId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['agenda', selectedHousehold?.id, selectedDate])
        toast.success('Dose snoozed for 15 minutes')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to snooze dose')
      }
    }
  )

  const handleLogDose = (e: React.FormEvent) => {
    e.preventDefault()
    if (!logFormData.administration_time) {
      toast.error('Administration time is required')
      return
    }
    
    logDoseMutation.mutate({
      medicationId: selectedDose.medication.id,
      logData: {
        ...logFormData,
        amount_given: logFormData.amount_given ? parseFloat(logFormData.amount_given) : undefined
      }
    })
  }

  const openLogModal = (dose: any) => {
    setSelectedDose(dose)
    setLogFormData({
      administration_time: new Date().toISOString().slice(0, 16), // Current date/time
      amount_given: dose.medication.dosage_amount.toString(),
      note: ''
    })
    setShowLogModal(true)
  }

  const handleSnooze = (doseId: string) => {
    snoozeDoseMutation.mutate(doseId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due':
        return 'bg-yellow-100 text-yellow-800'
      case 'taken':
        return 'bg-green-100 text-green-800'
      case 'skipped':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'due':
        return <Clock className="h-4 w-4" />
      case 'taken':
        return <CheckCircle className="h-4 w-4" />
      case 'skipped':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const isOverdue = (scheduledTime: Date) => {
    return new Date(scheduledTime) < new Date()
  }

  if (households.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No households yet</h3>
        <p className="text-gray-600">Create a household first to view the agenda</p>
      </div>
    )
  }

  if (!selectedHousehold && households.length > 0) {
    setSelectedHousehold(households[0])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="text-lg text-gray-600">View and manage medication schedules</p>
        </div>
      </div>

      {/* Household and Date Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-body">
            <label htmlFor="household" className="block text-sm font-medium text-gray-700 mb-2">
              Select Household
            </label>
            <select
              id="household"
              value={selectedHousehold?.id || ''}
              onChange={(e) => {
                const household = households.find(h => h.id === e.target.value)
                setSelectedHousehold(household)
              }}
              className="input"
            >
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              id="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="btn-secondary"
        >
          Previous Day
        </button>
        
        <div className="text-lg font-medium text-gray-900">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </div>
        
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="btn-secondary"
        >
          Next Day
        </button>
      </div>

      {/* Agenda Items */}
      {selectedHousehold && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Schedule for {format(selectedDate, 'MMMM d')}
            </h2>
            <span className="text-sm text-gray-500">
              {agendaData?.items.length || 0} medications
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : agendaData?.items.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No medications scheduled</h3>
              <p className="text-gray-600">No medications are scheduled for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {agendaData?.items.map((item: any) => (
                <div key={item.id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`p-3 rounded-lg ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {item.medication.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                            {item.status === 'due' && isOverdue(item.scheduled_time) && (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                Overdue
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium">Pet:</span> {item.pet.name} ({item.pet.species})
                            </p>
                            <p>
                              <span className="font-medium">Dosage:</span> {item.medication.dosage_amount} {item.medication.dosage_unit}
                            </p>
                            <p>
                              <span className="font-medium">Scheduled:</span> {format(new Date(item.scheduled_time), 'h:mm a')}
                            </p>
                            {item.medication.notes && (
                              <p>
                                <span className="font-medium">Notes:</span> {item.medication.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {item.status === 'due' && (
                          <>
                            <button
                              onClick={() => openLogModal(item)}
                              className="btn-success btn-sm"
                              title="Log dose"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Take
                            </button>
                            <button
                              onClick={() => handleSnooze(item.id)}
                              className="btn-warning btn-sm"
                              title="Snooze for 15 minutes"
                            >
                              <Snooze className="h-4 w-4 mr-1" />
                              Snooze
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Dose Modal */}
      {showLogModal && selectedDose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log Medication Dose</h3>
            <form onSubmit={handleLogDose} className="space-y-4">
              <div>
                <label htmlFor="medication" className="block text-sm font-medium text-gray-700 mb-1">
                  Medication
                </label>
                <input
                  type="text"
                  value={`${selectedDose.medication.name} - ${selectedDose.pet.name}`}
                  className="input bg-gray-50"
                  disabled
                />
              </div>
              
              <div>
                <label htmlFor="administration_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Administration Time *
                </label>
                <input
                  type="datetime-local"
                  id="administration_time"
                  value={logFormData.administration_time}
                  onChange={(e) => setLogFormData({ ...logFormData, administration_time: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="amount_given" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Given
                </label>
                <input
                  type="number"
                  id="amount_given"
                  value={logFormData.amount_given}
                  onChange={(e) => setLogFormData({ ...logFormData, amount_given: e.target.value })}
                  className="input"
                  placeholder={selectedDose.medication.dosage_amount.toString()}
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: {selectedDose.medication.dosage_amount} {selectedDose.medication.dosage_unit}
                </p>
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="note"
                  value={logFormData.note}
                  onChange={(e) => setLogFormData({ ...logFormData, note: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Any additional notes about this dose..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-success flex-1"
                  disabled={logDoseMutation.isLoading}
                >
                  {logDoseMutation.isLoading ? 'Logging...' : 'Log Dose'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Agenda
