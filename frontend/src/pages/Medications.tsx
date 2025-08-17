import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { petsApi, medicationsApi } from '../services/api'
import { 
  Pill, 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const Medications = () => {
  const { households } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMedication, setSelectedMedication] = useState<any>(null)
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null)
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    dosage_amount: '',
    dosage_unit_id: '',
    interval_qty: '',
    interval_unit: 'hours' as 'minutes' | 'hours' | 'days' | 'weeks' | 'months',
    times_of_day: [] as string[],
    byweekday: [] as number[],
    prn: false,
    start_date: '',
    end_date: '',
    notes: ''
  })

  const { data: petsData, isLoading: petsLoading } = useQuery(
    ['pets', selectedHousehold?.id],
    () => selectedHousehold ? petsApi.getByHousehold(selectedHousehold.id) : Promise.resolve({ pets: [] }),
    {
      enabled: !!selectedHousehold,
      refetchOnWindowFocus: false,
    }
  )

  const { data: medicationsData, isLoading: medicationsLoading } = useQuery(
    ['medications', selectedPet?.id],
    () => selectedPet ? medicationsApi.getByPet(selectedPet.id) : Promise.resolve({ medications: [] }),
    {
      enabled: !!selectedPet,
      refetchOnWindowFocus: false,
    }
  )

  const createMedicationMutation = useMutation(
    medicationsApi.create,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['medications', selectedPet?.id])
        setShowCreateModal(false)
        setFormData({
          name: '', dosage_amount: '', dosage_unit_id: '', interval_qty: '', interval_unit: 'hours',
          times_of_day: [], byweekday: [], prn: false, start_date: '', end_date: '', notes: ''
        })
        toast.success('Medication created successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create medication')
      }
    }
  )

  const updateMedicationMutation = useMutation(
    (data: { id: string; updateData: any }) => medicationsApi.update(data.id, data.updateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['medications', selectedPet?.id])
        setShowEditModal(false)
        setSelectedMedication(null)
        setFormData({
          name: '', dosage_amount: '', dosage_unit_id: '', interval_qty: '', interval_unit: 'hours',
          times_of_day: [], byweekday: [], prn: false, start_date: '', end_date: '', notes: ''
        })
        toast.success('Medication updated successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update medication')
      }
    }
  )

  const deleteMedicationMutation = useMutation(
    medicationsApi.delete,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['medications', selectedPet?.id])
        toast.success('Medication deleted successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete medication')
      }
    }
  )

  const handleCreateMedication = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.dosage_amount || !formData.dosage_unit_id || !formData.interval_qty) {
      toast.error('Required fields are missing')
      return
    }
    createMedicationMutation.mutate({
      ...formData,
      pet_id: selectedPet.id,
      dosage_amount: parseFloat(formData.dosage_amount),
      interval_qty: parseInt(formData.interval_qty),
      start_date: formData.start_date || new Date().toISOString().split('T')[0]
    })
  }

  const handleUpdateMedication = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.dosage_amount || !formData.dosage_unit_id || !formData.interval_qty) {
      toast.error('Required fields are missing')
      return
    }
    updateMedicationMutation.mutate({
      id: selectedMedication.id,
      updateData: {
        ...formData,
        dosage_amount: parseFloat(formData.dosage_amount),
        interval_qty: parseInt(formData.interval_qty)
      }
    })
  }

  const handleDeleteMedication = (medication: any) => {
    if (confirm(`Are you sure you want to delete ${medication.name}?`)) {
      deleteMedicationMutation.mutate(medication.id)
    }
  }

  const openEditModal = (medication: any) => {
    setSelectedMedication(medication)
    setFormData({
      name: medication.name,
      dosage_amount: medication.dosage_amount.toString(),
      dosage_unit_id: medication.dosage_unit_id,
      interval_qty: medication.interval_qty.toString(),
      interval_unit: medication.interval_unit,
      times_of_day: medication.times_of_day || [],
      byweekday: medication.byweekday || [],
      prn: medication.prn,
      start_date: medication.start_date ? format(new Date(medication.start_date), 'yyyy-MM-dd') : '',
      end_date: medication.end_date ? format(new Date(medication.end_date), 'yyyy-MM-dd') : '',
      notes: medication.notes || ''
    })
    setShowEditModal(true)
  }

  const openCreateModal = (pet: any) => {
    setSelectedPet(pet)
    setFormData({
      name: '', dosage_amount: '', dosage_unit_id: '', interval_qty: '', interval_unit: 'hours',
      times_of_day: [], byweekday: [], prn: false, start_date: '', end_date: '', notes: ''
    })
    setShowCreateModal(true)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'due':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'taken':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'skipped':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const dosageUnits = [
    { id: '1', name: 'mg' },
    { id: '2', name: 'units (insulin)' },
    { id: '3', name: 'mL' },
    { id: '4', name: 'tsp' },
    { id: '5', name: 'tbsp' },
    { id: '6', name: 'tablets' },
    { id: '7', name: 'caplets' },
    { id: '8', name: 'pills' }
  ]

  if (households.length === 0) {
    return (
      <div className="text-center py-12">
        <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No households yet</h3>
        <p className="text-gray-600">Create a household first to add medications</p>
      </div>
    )
  }

  if (!selectedHousehold && households.length > 0) {
    setSelectedHousehold(households[0])
  }

  if (!selectedPet && petsData?.pets.length > 0) {
    setSelectedPet(petsData.pets[0])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Medications</h1>
          <p className="text-lg text-gray-600">Manage your pets' medications and schedules</p>
        </div>
        {selectedPet && (
          <button
            onClick={() => openCreateModal(selectedPet)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </button>
        )}
      </div>

      {/* Household and Pet Selectors */}
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
                setSelectedPet(null)
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

        {selectedHousehold && (
          <div className="card">
            <div className="card-body">
              <label htmlFor="pet" className="block text-sm font-medium text-gray-700 mb-2">
                Select Pet
              </label>
              <select
                id="pet"
                value={selectedPet?.id || ''}
                onChange={(e) => {
                  const pet = petsData?.pets.find(p => p.id === e.target.value)
                  setSelectedPet(pet)
                }}
                className="input"
                disabled={petsLoading}
              >
                <option value="">Select a pet</option>
                {petsData?.pets.map((pet: any) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Medications List */}
      {selectedPet && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Medications for {selectedPet.name}
            </h2>
            <span className="text-sm text-gray-500">
              {medicationsData?.medications.length || 0} medications
            </span>
          </div>

          {medicationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : medicationsData?.medications.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No medications yet</h3>
              <p className="text-gray-600 mb-4">Add your first medication to get started</p>
              <button
                onClick={() => openCreateModal(selectedPet)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Medication
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicationsData?.medications.map((medication: any) => (
                <div key={medication.id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <Pill className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{medication.name}</h3>
                          <p className="text-sm text-gray-600">
                            {medication.dosage_amount} {medication.dosage_unit_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(medication)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit medication"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedication(medication)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>
                          Every {medication.interval_qty} {medication.interval_unit}
                          {medication.interval_qty > 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {medication.times_of_day && medication.times_of_day.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>At {medication.times_of_day.join(', ')}</span>
                        </div>
                      )}

                      {medication.byweekday && medication.byweekday.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {medication.byweekday.map(day => 
                              ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][day]
                            ).join(', ')}
                          </span>
                        </div>
                      )}

                      {medication.prn && (
                        <div className="flex items-center space-x-2 text-sm text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>As needed (PRN)</span>
                        </div>
                      )}

                      {medication.notes && (
                        <p className="text-sm text-gray-600 mt-2">{medication.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Medication Modal */}
      {showCreateModal && selectedPet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Medication</h3>
            <form onSubmit={handleCreateMedication} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Amoxicillin"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="dosage_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage Amount *
                  </label>
                  <input
                    type="number"
                    id="dosage_amount"
                    value={formData.dosage_amount}
                    onChange={(e) => setFormData({ ...formData, dosage_amount: e.target.value })}
                    className="input"
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="dosage_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage Unit *
                  </label>
                  <select
                    id="dosage_unit"
                    value={formData.dosage_unit_id}
                    onChange={(e) => setFormData({ ...formData, dosage_unit_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select unit</option>
                    {dosageUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="interval_qty" className="block text-sm font-medium text-gray-700 mb-1">
                    Interval Quantity *
                  </label>
                  <input
                    type="number"
                    id="interval_qty"
                    value={formData.interval_qty}
                    onChange={(e) => setFormData({ ...formData, interval_qty: e.target.value })}
                    className="input"
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="interval_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Interval Unit *
                  </label>
                  <select
                    id="interval_unit"
                    value={formData.interval_unit}
                    onChange={(e) => setFormData({ ...formData, interval_unit: e.target.value as any })}
                    className="input"
                    required
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input"
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Options
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="prn"
                      checked={formData.prn}
                      onChange={(e) => setFormData({ ...formData, prn: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="prn" className="text-sm text-gray-700">
                      As needed (PRN)
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Additional notes about this medication..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={createMedicationMutation.isLoading}
                >
                  {createMedicationMutation.isLoading ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {showEditModal && selectedMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit {selectedMedication.name}</h3>
            <form onSubmit={handleUpdateMedication} className="space-y-4">
              {/* Same form fields as create modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Amoxicillin"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-dosage_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage Amount *
                  </label>
                  <input
                    type="number"
                    id="edit-dosage_amount"
                    value={formData.dosage_amount}
                    onChange={(e) => setFormData({ ...formData, dosage_amount: e.target.value })}
                    className="input"
                    placeholder="0.0"
                    step="0.1"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-dosage_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage Unit *
                  </label>
                  <select
                    id="edit-dosage_unit"
                    value={formData.dosage_unit_id}
                    onChange={(e) => setFormData({ ...formData, dosage_unit_id: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="">Select unit</option>
                    {dosageUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-interval_qty" className="block text-sm font-medium text-gray-700 mb-1">
                    Interval Quantity *
                  </label>
                  <input
                    type="number"
                    id="edit-interval_qty"
                    value={formData.interval_qty}
                    onChange={(e) => setFormData({ ...formData, interval_qty: e.target.value })}
                    className="input"
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="edit-interval_unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Interval Unit *
                  </label>
                  <select
                    id="edit-interval_unit"
                    value={formData.interval_unit}
                    onChange={(e) => setFormData({ ...formData, interval_unit: e.target.value as any })}
                    className="input"
                    required
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="edit-start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label htmlFor="edit-end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="edit-end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input"
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Options
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="edit-prn"
                      checked={formData.prn}
                      onChange={(e) => setFormData({ ...formData, prn: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="edit-prn" className="text-sm text-gray-700">
                      As needed (PRN)
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Additional notes about this medication..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={updateMedicationMutation.isLoading}
                >
                  {updateMedicationMutation.isLoading ? 'Updating...' : 'Update Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Medications
