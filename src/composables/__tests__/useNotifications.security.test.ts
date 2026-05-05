import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotifications } from '../useNotifications'

// Mock notificationService to avoid side effects
vi.mock('@/services/notificationService', () => ({
  requestNotificationPermission: vi.fn(),
  scheduleNotification: vi.fn(),
  cancelNotification: vi.fn(),
}))

describe('useNotifications - Security and Robustness', () => {
  const NOTIFICATION_SETTINGS_KEY = 'radio-fit-app-notification-settings'

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, 'not-a-json')

    // We want to ensure it doesn't throw and uses defaults
    let isEnabled, notificationTime;
    expect(() => {
      const result = useNotifications()
      isEnabled = result.isEnabled
      notificationTime = result.notificationTime
    }).not.toThrow()

    expect(isEnabled.value).toBe(false)
    expect(notificationTime.value).toBe('08:00')
  })

  it('should handle non-object JSON in localStorage gracefully', () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, '123')

    const { isEnabled, notificationTime } = useNotifications()

    expect(isEnabled.value).toBe(false)
    expect(notificationTime.value).toBe('08:00')
  })

  it('should handle missing fields in localStorage JSON', () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({ isEnabled: true }))

    const { isEnabled, notificationTime } = useNotifications()

    expect(isEnabled.value).toBe(true)
    expect(notificationTime.value).toBe('08:00') // Default
  })

  it('should handle invalid time format in localStorage JSON', () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({ isEnabled: true, time: 'invalid-time' }))

    const { isEnabled, notificationTime } = useNotifications()

    expect(isEnabled.value).toBe(true)
    // If it's invalid, it should probably revert to default or handle it safely.
    // Current implementation might just accept it if it's a string.
    // I want to enforce HH:mm format.
    expect(notificationTime.value).toBe('08:00')
  })

  it('should handle extremely long time strings (potential DoS/injection)', () => {
    const longString = '0'.repeat(10000)
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({ isEnabled: true, time: longString }))

    const { isEnabled, notificationTime } = useNotifications()

    expect(isEnabled.value).toBe(true)
    expect(notificationTime.value).toBe('08:00')
  })
})
