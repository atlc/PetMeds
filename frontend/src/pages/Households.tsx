import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { householdsApi } from '../services/api'
import { 
  Users, 
  Plus, 
  UserPlus, 
  Settings, 
  Trash2,
  Mail,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const Households = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedHousehold, setSelectedHousehold] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member' as 'owner' | 'member' | 'sitter',
    access_expires_at: ''
  })

  const { data: householdsData, isLoading } = useQuery(
    'households',
    householdsApi.getAll,
    {
      refetchOnWindowFocus: false,
    }
  )

  const createHouseholdMutation = useMutation(
    householdsApi.create,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('households')
        setShowCreateModal(false)
        setFormData({ name: '', email: '', role: 'member', access_expires_at: '' })
        toast.success('Household created successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create household')
      }
    }
  )

  const inviteMemberMutation = useMutation(
    (data: { householdId: string; inviteData: any }) => 
      householdsApi.inviteMember(data.householdId, data.inviteData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('households')
        setShowInviteModal(false)
        setFormData({ name: '', email: '', role: 'member', access_expires_at: '' })
        toast.success('Invitation sent successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to send invitation')
      }
    }
  )

  const removeMemberMutation = useMutation(
    (data: { householdId: string; userId: string }) => 
      householdsApi.removeMember(data.householdId, data.userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('households')
        toast.success('Member removed successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to remove member')
      }
    }
  )

  const handleCreateHousehold = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Household name is required')
      return
    }
    createHouseholdMutation.mutate({ name: formData.name.trim() })
  }

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.role) {
      toast.error('Email and role are required')
      return
    }
    inviteMemberMutation.mutate({
      householdId: selectedHousehold.id,
      inviteData: {
        email: formData.email.trim(),
        role: formData.role,
        access_expires_at: formData.access_expires_at || undefined
      }
    })
  }

  const handleRemoveMember = (householdId: string, userId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from this household?`)) {
      removeMemberMutation.mutate({ householdId, userId })
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'member':
        return 'bg-blue-100 text-blue-800'
      case 'sitter':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Households</h1>
          <p className="text-lg text-gray-600">Manage your households and members</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Household
        </button>
      </div>

      {/* Households Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {householdsData?.households.map((household) => (
          <div key={household.id} className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{household.name}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedHousehold(household)
                      setShowInviteModal(true)
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Invite member"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {/* Members */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Members</h4>
                {household.members.map((member: any) => (
                  <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {member.user?.image_url ? (
                        <img
                          src={member.user.image_url}
                          alt={member.user.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.user?.name || member.invited_email}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                          {member.access_expires_at && (
                            <div className="flex items-center text-xs text-gray-500">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(member.access_expires_at), 'MMM d')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {member.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(household.id, member.user_id, member.user?.name || member.invited_email)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pets */}
              {household.pets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Pets</h4>
                  <div className="space-y-2">
                    {household.pets.map((pet: any) => (
                      <div key={pet.id} className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>🐾</span>
                        <span>{pet.name} ({pet.species})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Household Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Household</h3>
            <form onSubmit={handleCreateHousehold} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Household Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter household name"
                  required
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
                  disabled={createHouseholdMutation.isLoading}
                >
                  {createHouseholdMutation.isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedHousehold && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Invite Member to {selectedHousehold.name}
            </h3>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="input"
                >
                  <option value="member">Member</option>
                  <option value="sitter">Sitter</option>
                </select>
              </div>

              {formData.role === 'sitter' && (
                <div>
                  <label htmlFor="expires" className="block text-sm font-medium text-gray-700 mb-1">
                    Access Expires (Optional)
                  </label>
                  <input
                    type="date"
                    id="expires"
                    value={formData.access_expires_at}
                    onChange={(e) => setFormData({ ...formData, access_expires_at: e.target.value })}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={inviteMemberMutation.isLoading}
                >
                  {inviteMemberMutation.isLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Households
