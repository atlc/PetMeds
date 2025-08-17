import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { pushApi } from '../services/api'
import { 
  Settings as SettingsIcon, 
  Bell, 
  Globe, 
  Shield,
  User,
  Smartphone,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

const Settings = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushFormData, setPushFormData] = useState({
    device_label: ''
  })

  const { data: pushSubscriptions, isLoading: pushLoading } = useQuery(
    'push-subscriptions',
    pushApi.getSubscriptions,
    {
      refetchOnWindowFocus: false,
    }
  )

  const subscribePushMutation = useMutation(
    pushApi.subscribe,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('push-subscriptions')
        setShowPushModal(false)
        setPushFormData({ device_label: '' })
        toast.success('Push notifications enabled successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to enable push notifications')
      }
    }
  )

  const unsubscribePushMutation = useMutation(
    pushApi.unsubscribe,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('push-subscriptions')
        toast.success('Push notifications disabled successfully!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to disable push notifications')
      }
    }
  )

  const togglePushMutation = useMutation(
    (data: { id: string; enabled: boolean }) => 
      pushApi.toggleSubscription(data.id, data.enabled),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('push-subscriptions')
        toast.success('Push notification settings updated!')
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update push notification settings')
      }
    }
  )

  const handleEnablePushNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Push notifications are not supported in this browser')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Permission denied for push notifications')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY || 'your-vapid-public-key'
      })

      const subscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        device_label: pushFormData.device_label || 'This device'
      }

      subscribePushMutation.mutate(subscriptionData)
    } catch (error) {
      console.error('Error enabling push notifications:', error)
      toast.error('Failed to enable push notifications')
    }
  }

  const handleDisablePushNotifications = async (endpoint: string) => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
      }
      
      unsubscribePushMutation.mutate(endpoint)
    } catch (error) {
      console.error('Error disabling push notifications:', error)
      toast.error('Failed to disable push notifications')
    }
  }

  const handleTogglePushSubscription = (id: string, enabled: boolean) => {
    togglePushMutation.mutate({ id, enabled })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-lg text-gray-600">Manage your account preferences and notifications</p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">User Profile</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="flex items-center space-x-4">
              {user?.image_url ? (
                <img
                  src={user.image_url}
                  alt={user.name}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
              )}
              <div>
                <h4 className="text-lg font-medium text-gray-900">{user?.name}</h4>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-sm text-gray-500">Timezone: {user?.timezone || 'UTC'}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Profile information is managed through your Google account.
              </p>
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            {pushLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : pushSubscriptions?.subscriptions.length === 0 ? (
              <div className="text-center py-4">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">No push notification subscriptions</p>
                <button
                  onClick={() => setShowPushModal(true)}
                  className="btn-primary"
                >
                  Enable Push Notifications
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Manage push notifications for your devices:
                </p>
                
                {pushSubscriptions?.subscriptions.map((subscription: any) => (
                  <div key={subscription.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {subscription.device_label || 'Unknown device'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {subscription.enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTogglePushSubscription(subscription.id, !subscription.enabled)}
                        className={`px-3 py-1 text-xs rounded-full ${
                          subscription.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {subscription.enabled ? 'On' : 'Off'}
                      </button>
                      <button
                        onClick={() => handleDisablePushNotifications(subscription.endpoint)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setShowPushModal(true)}
                  className="btn-secondary w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Device
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Privacy & Security</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Data Sharing</p>
                  <p className="text-xs text-gray-500">Share data with household members</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="data-sharing"
                    defaultChecked
                    className="sr-only"
                  />
                  <label
                    htmlFor="data-sharing"
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 cursor-pointer"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Analytics</p>
                  <p className="text-xs text-gray-500">Help improve PetMeds</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    id="analytics"
                    className="sr-only"
                  />
                  <label
                    htmlFor="analytics"
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 cursor-pointer"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </label>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Your data is encrypted and stored securely. We never share your personal information with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">About PetMeds</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium text-gray-900">1.0.0</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Build</span>
                <span className="text-sm font-medium text-gray-900">2024.1.0</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">License</span>
                <span className="text-sm font-medium text-gray-900">MIT</span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                PetMeds is a progressive web application designed to help you manage your pets' medications and schedules.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enable Push Notifications Modal */}
      {showPushModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enable Push Notifications</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="device_label" className="block text-sm font-medium text-gray-700 mb-1">
                  Device Label (Optional)
                </label>
                <input
                  type="text"
                  id="device_label"
                  value={pushFormData.device_label}
                  onChange={(e) => setPushFormData({ ...pushFormData, device_label: e.target.value })}
                  className="input"
                  placeholder="e.g., iPhone, Desktop, etc."
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">What you'll receive:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Medication reminders 15 minutes before due time</li>
                      <li>• Overdue medication notifications</li>
                      <li>• Important updates about your pets</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPushModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnablePushNotifications}
                  className="btn-primary flex-1"
                  disabled={subscribePushMutation.isLoading}
                >
                  {subscribePushMutation.isLoading ? 'Enabling...' : 'Enable Notifications'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
