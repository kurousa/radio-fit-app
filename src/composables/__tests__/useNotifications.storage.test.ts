import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotifications, _resetToastState } from '../useNotifications'

import { nextTick } from 'vue'

// Mock notificationService
vi.mock('@/services/notificationService', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  scheduleNotification: vi.fn(),
  cancelNotification: vi.fn(),
}))

describe('useNotifications - Storage Errors', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    _resetToastState()
  })

  it('should not crash when localStorage.setItem throws an error', async () => {
    // Mock setItem to throw an error
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    // Mock console.error to avoid polluting test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Trigger a change that calls saveSettings
    const { notificationTime } = useNotifications()
    notificationTime.value = '09:00'
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // It should have called setItem and caught the error
    expect(setItemSpy).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving notification settings to localStorage:',
      expect.any(Error)
    )

    // Verify it didn't crash and the app continues to function
    expect(notificationTime.value).toBe('09:00')

    consoleSpy.mockRestore()
    setItemSpy.mockRestore()
  })
})
