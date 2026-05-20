import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotifications, _resetToastState } from '../useNotifications'
import * as notificationService from '@/services/notificationService'
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

    // Ensure the mock returns 'granted'
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue('granted')

    const { isEnabled } = useNotifications()

    // Trigger a change that calls saveSettings
    // We need to bypass the watch conditional 'oldValue === undefined'
    // To do this, we can set it to false first, wait for tick, then to true
    isEnabled.value = false
    await nextTick()
    isEnabled.value = true
    await nextTick()

    // Wait for the async watcher to complete its internal promises
    await nextTick()

    // It should have called setItem and caught the error
    expect(setItemSpy).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving notification settings to localStorage:',
      expect.any(Error)
    )

    // Verify it didn't crash and the app continues to function
    expect(isEnabled.value).toBe(true)

    consoleSpy.mockRestore()
    setItemSpy.mockRestore()
  })
})
