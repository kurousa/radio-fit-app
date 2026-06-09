import { ref, watch } from 'vue'
import * as notificationService from '@/services/notificationService'
import { useToastNotifications } from './useToastNotifications'

// --- Composable for Push Notification Settings ---
const NOTIFICATION_SETTINGS_KEY = 'radio-fit-app-notification-settings'

export interface NotificationSettings {
  isEnabled: boolean
  time: string
}

export function useNotifications() {
  const isEnabled = ref(false)
  const notificationTime = ref('08:00')
  const { addToast } = useToastNotifications()

  const loadSettings = () => {
    const settingsJson = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (!settingsJson) return

    try {
      const settings = JSON.parse(settingsJson, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined
        return value
      })
      if (settings && typeof settings === 'object') {
        if (typeof settings.isEnabled === 'boolean') {
          isEnabled.value = settings.isEnabled
        }
        if (
          typeof settings.time === 'string' &&
          settings.time.length === 5 &&
          /^([01]\d|2[0-3]):([0-5]\d)$/.test(settings.time)
        ) {
          notificationTime.value = settings.time
        }
      }
    } catch (error) {
      console.error('Error parsing notification settings from localStorage:', error)
    }
  }

  const saveSettings = () => {
    const settings: NotificationSettings = {
      isEnabled: isEnabled.value,
      time: notificationTime.value,
    }
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Error saving notification settings to localStorage:', error)
    }
  }

  // Load initial settings
  loadSettings()

  // Watch for changes made by the user
  watch(isEnabled, async (newValue, oldValue) => {
    // Only act on changes, not initial load where oldValue is undefined
    if (oldValue === undefined) {
      return
    }

    if (newValue) {
      const permission = await notificationService.requestNotificationPermission()
      if (permission === 'granted') {
        saveSettings()
        await notificationService.scheduleNotification(notificationTime.value)
        addToast(`通知を ${notificationTime.value} に設定しました`, 'info')
      } else {
        if (permission !== 'default') {
          addToast('通知がブロックされています。ブラウザの設定を確認してください。', 'error')
        }
        isEnabled.value = false // Revert
      }
    } else {
      saveSettings()
      await notificationService.cancelNotification()
      addToast('通知をオフにしました', 'warning')
    }
  })

  watch(notificationTime, async (newValue, oldValue) => {
    // Only act on changes, not initial load
    if (oldValue === undefined) {
      return
    }

    saveSettings()
    if (isEnabled.value) {
      await notificationService.scheduleNotification(newValue)
      addToast(`通知時刻を ${newValue} に変更しました`, 'info')
    }
  })

  return {
    isEnabled,
    notificationTime,
  }
}
