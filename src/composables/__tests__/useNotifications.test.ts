import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotifications } from '../useNotifications'
import * as notificationService from '@/services/notificationService'
import { ref, nextTick } from 'vue'

// Mock notificationService
vi.mock('@/services/notificationService', () => ({
  requestNotificationPermission: vi.fn(),
  scheduleNotification: vi.fn(),
  cancelNotification: vi.fn(),
}))

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { isEnabled, notificationTime } = useNotifications()
    expect(isEnabled.value).toBe(false)
    expect(notificationTime.value).toBe('08:00')
  })

  it('should load settings from localStorage', () => {
    localStorage.setItem(
      'radio-fit-app-notification-settings',
      JSON.stringify({ isEnabled: true, time: '10:30' })
    )
    const { isEnabled, notificationTime } = useNotifications()
    expect(isEnabled.value).toBe(true)
    expect(notificationTime.value).toBe('10:30')
  })

  it('should request permission and schedule notification when enabled', async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue('granted')
    const { isEnabled, notificationTime } = useNotifications()

    isEnabled.value = true
    notificationTime.value = '09:00'
    await nextTick() // Wait for watcher

    expect(notificationService.requestNotificationPermission).toHaveBeenCalled()
    expect(notificationService.scheduleNotification).toHaveBeenCalledWith('09:00')
  })

  it('should not schedule notification if permission is denied', async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue('denied')
    const { isEnabled } = useNotifications()

    isEnabled.value = true
    await nextTick()

    expect(notificationService.requestNotificationPermission).toHaveBeenCalled()
    expect(notificationService.scheduleNotification).not.toHaveBeenCalled()
    expect(isEnabled.value).toBe(false) // Should revert to false
  })

  it('should cancel notification when disabled', async () => {
    // First, enable it
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue('granted')
    const { isEnabled } = useNotifications()
    isEnabled.value = true
    await nextTick()

    // Now, disable it
    isEnabled.value = false
    await nextTick()

    expect(notificationService.cancelNotification).toHaveBeenCalled()
  })
})