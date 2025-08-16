import { ref, watch, readonly } from 'vue'
import * as notificationService from '@/services/notificationService'

// --- State for Toast Notifications (Global) ---
interface ToastNotification {
  id: number
  message: string
  type: 'info' | 'error' | 'warning'
  duration: number
}

const toastNotifications = ref<ToastNotification[]>([])

let nextId = 1

// --- Composable for Toast Notifications ---
export function useToastNotifications() {
  const addToast = (
    message: string,
    type: ToastNotification['type'] = 'info',
    duration = 5000
  ) => {
    const id = nextId++
    toastNotifications.value.push({ id, message, type, duration })
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }

  const removeToast = (id: number) => {
    const index = toastNotifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      toastNotifications.value.splice(index, 1)
    }
  }

  return {
    notifications: readonly(toastNotifications),
    addToast,
    removeToast,
  }
}

// --- Composable for Push Notification Settings ---
const NOTIFICATION_SETTINGS_KEY = 'radio-fit-app-notification-settings'

interface NotificationSettings {
  isEnabled: boolean
  time: string
}

export function useNotifications() {
  const isEnabled = ref(false)
  const notificationTime = ref('08:00')
  const { addToast } = useToastNotifications()

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

  // Load initial settings
  loadSettings()

  // Watch for changes made by the user
  watch(isEnabled, async (newValue, oldValue) => {
    // Only act on changes, not initial load where oldValue is undefined
    if (oldValue === undefined) {
      return
    }

    saveSettings()
    if (newValue) {
      const permission = await notificationService.requestNotificationPermission()
      if (permission === 'granted') {
        await notificationService.scheduleNotification(notificationTime.value)
        addToast(`通知を ${notificationTime.value} に設定しました`, 'info')
      } else {
        if (permission !== 'default') {
          addToast('通知がブロックされています。ブラウザの設定を確認してください。', 'error')
        }
        isEnabled.value = false // Revert
      }
    } else {
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