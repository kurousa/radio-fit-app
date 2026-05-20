import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotifications, _resetToastState } from '../useNotifications'
import * as notificationService from '@/services/notificationService'
import { nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

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
    vi.mocked(notificationService.requestNotificationPermission).mockResolvedValue('granted')
  })

  it('should not crash when localStorage.setItem throws an error', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { isEnabled } = useNotifications()

    // Trigger a change
    isEnabled.value = true
    await nextTick()
    await flushPromises()

    expect(setItemSpy).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error saving notification settings to localStorage:',
      expect.any(Error),
    )

    expect(isEnabled.value).toBe(true)

    consoleSpy.mockRestore()
    setItemSpy.mockRestore()
  })
})
