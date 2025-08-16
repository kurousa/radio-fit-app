export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered from service:', registration.scope)
    } catch (error) {
      console.error('Service Worker registration failed from service:', error)
    }
  }
}

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()
    return permission
  }
  return 'default'
}

export const scheduleNotification = async (time: string): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      time,
    })
  }
}

export const cancelNotification = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({
      type: 'CANCEL_NOTIFICATION',
    })
  }
}
