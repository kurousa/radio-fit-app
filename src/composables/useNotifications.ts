import { ref, watchEffect } from 'vue'
import * as notificationService from '@/services/notificationService'

const NOTIFICATION_SETTINGS_KEY = 'radio-fit-app-notification-settings'

interface NotificationSettings {
  isEnabled: boolean
  time: string
}

export function useNotifications() {
  const isEnabled = ref(false)
  const notificationTime = ref('08:00')

  const loadSettings = () => {
    const settingsJson = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (settingsJson) {
      const settings = JSON.parse(settingsJson) as NotificationSettings
      isEnabled.value = settings.isEnabled
      notificationTime.value = settings.time
    }
  }

  const saveSettings = () => {
    const settings: NotificationSettings = {
      isEnabled: isEnabled.value,
      time: notificationTime.value,
    }
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
  }

  loadSettings()

  watchEffect(async () => {
    saveSettings()
    if (isEnabled.value) {
      const permission = await notificationService.requestNotificationPermission()
      if (permission === 'granted') {
        await notificationService.scheduleNotification(notificationTime.value)
      } else {
        // Revert if permission is not granted
        isEnabled.value = false
      }
    } else {
      await notificationService.cancelNotification()
    }
  })

  return {
    isEnabled,
    notificationTime,
  }
}