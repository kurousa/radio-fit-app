import { ref, readonly } from 'vue'

// --- State for Toast Notifications (Global) ---
export interface ToastNotification {
  id: number
  message: string
  type: 'info' | 'error' | 'warning'
  duration: number
}

const toastNotifications = ref<ToastNotification[]>([])
const toastTimeouts = new Map<number, ReturnType<typeof setTimeout>>()

let nextId = 1

// --- Composable for Toast Notifications ---

/**
 * Resets the toast notification state.
 * This is intended for testing purposes only to ensure test isolation.
 */
export function _resetToastState() {
  toastNotifications.value = []
  toastTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
  toastTimeouts.clear()
  nextId = 1
}

export function useToastNotifications() {
  const addToast = (message: string, type: ToastNotification['type'] = 'info', duration = 5000) => {
    const id = nextId++
    toastNotifications.value.push({ id, message, type, duration })
    if (duration > 0) {
      const timeoutId = setTimeout(() => removeToast(id), duration)
      toastTimeouts.set(id, timeoutId)
    }
  }

  const removeToast = (id: number) => {
    if (toastTimeouts.has(id)) {
      clearTimeout(toastTimeouts.get(id)!)
      toastTimeouts.delete(id)
    }
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
