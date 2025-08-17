import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { petsApi } from '../services/api'
import { 
  PawPrint, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Scale
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const Pets = () => {
  const { households } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    birthdate: '',
    weight_kg: ''
  })

  const { data: petsData, isLoading } = useQuery(
    ['pets', selectedHousehold?.id],
    () => selectedHousehold ? petsApi.getByHousehold(selectedHousehold.id) : Promise.resolve({ pets: [] }),
    {
      enabled: !!selectedHousehold,
      refetchOnWindowFocus: false,
    }
  )

  const createPetMutation = useMutation(
    petsApi.create,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pets', selectedHousehold?.id])
        setShowCreateModal(false)
        setFormData({ name: '', species: '', birthdate: '', weight_kg: '' })
        toast.success('Pet created successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create pet')
      }
    }
  )

  const updatePetMutation = useMutation(
    (data: { id: string; updateData: any }) => petsApi.update(data.id, data.updateData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pets', selectedHousehold?.id])
        setShowEditModal(false)
        setSelectedPet(null)
        setFormData({ name: '', species: '', birthdate: '', weight_kg: '' })
        toast.success('Pet updated successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update pet')
      }
    }
  )

  const deletePetMutation = useMutation(
    petsApi.delete,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pets', selectedHousehold?.id])
        toast.success('Pet deleted successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete pet')
      }
    }
  )

  const handleCreatePet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.species.trim()) {
      toast.error('Name and species are required')
      return
    }
    createPetMutation.mutate({
      ...formData,
      household_id: selectedHousehold.id,
      name: formData.name.trim(),
      species: formData.species.trim(),
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined
    })
  }

  const handleUpdatePet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.species.trim()) {
      toast.error('Name and species are required')
      return
    }
    updatePetMutation.mutate({
      id: selectedPet.id,
      updateData: {
        ...formData,
        name: formData.name.trim(),
        species: formData.species.trim(),
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined
      }
    })
  }

  const handleDeletePet = (pet: any) => {
    if (confirm(`Are you sure you want to delete ${pet.name}? This will also remove all associated medications.`)) {
      deletePetMutation.mutate(pet.id)
    }
  }

  const openEditModal = (pet: any) => {
    setSelectedPet(pet)
    setFormData({
      name: pet.name,
      species: pet.species,
      birthdate: pet.birthdate ? format(new Date(pet.birthdate), 'yyyy-MM-dd') : '',
      weight_kg: pet.weight_kg ? pet.weight_kg.toString() : ''
    })
    setShowEditModal(true)
  }

  const openCreateModal = (household: any) => {
    setSelectedHousehold(household)
    setFormData({ name: '', species: '', birthdate: '', weight_kg: '' })
    setShowCreateModal(true)
  }

  if (households.length === 0) {
    return (
      <div className="text-center py-12">
        <PawPrint className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No households yet</h3>
        <p className="text-gray-600">Create a household first to add pets</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Pets</h1>
          <p className="text-lg text-gray-600">Manage your pets and their information</p>
        </div>
        {selectedHousehold && (
          <button
            onClick={() => openCreateModal(selectedHousehold)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pet
          </button>
        )}
      </div>

      {/* Household Selector */}
      {households.length > 1 && (
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
              className="input max-w-xs"
            >
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Pets Grid */}
      {selectedHousehold && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Pets in {selectedHousehold.name}
            </h2>
            <span className="text-sm text-gray-500">
              {petsData?.pets.length || 0} pets
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : petsData?.pets.length === 0 ? (
            <div className="text-center py-12">
              <PawPrint className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pets yet</h3>
              <p className="text-gray-600 mb-4">Add your first pet to get started</p>
              <button
                onClick={() => openCreateModal(selectedHousehold)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {petsData?.pets.map((pet: any) => (
                <div key={pet.id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{pet.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{pet.species}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(pet)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit pet"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePet(pet)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete pet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {pet.birthdate && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Born {format(new Date(pet.birthdate), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      
                      {pet.weight_kg && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Scale className="h-4 w-4" />
                          <span>{pet.weight_kg} kg</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Pet Modal */}
      {showCreateModal && selectedHousehold && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Pet</h3>
            <form onSubmit={handleCreatePet} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter pet name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">
                  Species
                </label>
                <input
                  type="text"
                  id="species"
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  className="input"
                  placeholder="e.g., Dog, Cat, Bird"
                  required
                />
              </div>

              <div>
                <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date (Optional)
                </label>
                <input
                  type="date"
                  id="birthdate"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="input"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                  Weight in kg (Optional)
                </label>
                <input
                  type="number"
                  id="weight"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="input"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
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
                  disabled={createPetMutation.isLoading}
                >
                  {createPetMutation.isLoading ? 'Adding...' : 'Add Pet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pet Modal */}
      {showEditModal && selectedPet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit {selectedPet.name}</h3>
            <form onSubmit={handleUpdatePet} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Name
                </label>
                <input
                  type="text"
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter pet name"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="edit-species" className="block text-sm font-medium text-gray-700 mb-1">
                  Species
                </label>
                <input
                  type="text"
                  id="edit-species"
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  className="input"
                  placeholder="e.g., Dog, Cat, Bird"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-birthdate" className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date (Optional)
                </label>
                <input
                  type="date"
                  id="edit-birthdate"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="input"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label htmlFor="edit-weight" className="block text-sm font-medium text-gray-700 mb-1">
                  Weight in kg (Optional)
                </label>
                <input
                  type="number"
                  id="edit-weight"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="input"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
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
                  disabled={updatePetMutation.isLoading}
                >
                  {updatePetMutation.isLoading ? 'Updating...' : 'Update Pet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pets
