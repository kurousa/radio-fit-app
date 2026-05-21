import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotifications, _resetToastState } from '../useNotifications'
import { flushPromises } from '@vue/test-utils';

// Mock notificationService
vi.mock('@/services/notificationService', () => ({
  requestNotificationPermission: vi.fn(() => Promise.resolve('granted')),
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

    const { isEnabled } = useNotifications()

    // Trigger a change that calls saveSettings
    isEnabled.value = true
    await flushPromises()

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
