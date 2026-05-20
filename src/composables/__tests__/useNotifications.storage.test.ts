import { flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotifications, _resetToastState } from '../useNotifications'

import { nextTick } from 'vue'

// Mock notificationService
vi.mock('@/services/notificationService')

describe('useNotifications - Storage Errors', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    _resetToastState()
  })

  it('should not crash when localStorage.setItem throws an error', async () => {
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue('granted')
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
    await flushPromises()

    // It should have called setItem and caught the error
    expect(setItemSpy).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving notification settings to localStorage:',
      expect.any(Error),
    )

    // Verify it didn't crash and the app continues to function
    expect(notificationTime.value).toBe('09:00')

    consoleSpy.mockRestore()
    setItemSpy.mockRestore()
  })
})
