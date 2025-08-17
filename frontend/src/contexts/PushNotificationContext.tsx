import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface PushNotificationContextType {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<NotificationPermission>
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined)

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext)
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider')
  }
  return context
}

interface PushNotificationProviderProps {
  children: ReactNode
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported in this browser')
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      throw error
    }
  }

  const value: PushNotificationContextType = {
    permission,
    isSupported,
    requestPermission
  }

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  )
}
