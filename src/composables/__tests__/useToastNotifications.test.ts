import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToastNotifications } from '../useNotifications'

describe('useToastNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    const { notifications, removeToast } = useToastNotifications()
    // Clear all notifications after each test to ensure isolation
    // We use a copy of the array because removeToast modifies the original
    const currentNotifications = [...notifications.value]
    currentNotifications.forEach((n) => removeToast(n.id))

    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should initialize with no notifications', () => {
    const { notifications } = useToastNotifications()
    expect(notifications.value).toEqual([])
  })

  it('should add a toast with default values', () => {
    const { addToast, notifications } = useToastNotifications()
    addToast('Test Message')

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0]).toMatchObject({
      message: 'Test Message',
      type: 'info',
      duration: 5000,
    })
    expect(notifications.value[0].id).toBeDefined()
  })

  it('should add a toast with custom values', () => {
    const { addToast, notifications } = useToastNotifications()
    addToast('Error Message', 'error', 2000)

    expect(notifications.value).toHaveLength(1)
    expect(notifications.value[0]).toMatchObject({
      message: 'Error Message',
      type: 'error',
      duration: 2000,
    })
  })

  it('should assign unique incremental IDs', () => {
    const { addToast, notifications } = useToastNotifications()
    addToast('Message 1')
    addToast('Message 2')

    expect(notifications.value).toHaveLength(2)
    expect(notifications.value[0].id).not.toBe(notifications.value[1].id)
    expect(notifications.value[1].id).toBe(notifications.value[0].id + 1)
  })

  it('should remove a toast manually', () => {
    const { addToast, removeToast, notifications } = useToastNotifications()
    addToast('To be removed')
    const id = notifications.value[0].id

    removeToast(id)
    expect(notifications.value).toHaveLength(0)
  })

  it('should remove a toast automatically after duration', () => {
    const { addToast, notifications } = useToastNotifications()
    addToast('Auto remove', 'info', 1000)

    expect(notifications.value).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    expect(notifications.value).toHaveLength(0)
  })

  it('should not remove a toast automatically if duration is 0', () => {
    const { addToast, notifications } = useToastNotifications()
    addToast('Persistent', 'info', 0)

    expect(notifications.value).toHaveLength(1)

    vi.advanceTimersByTime(10000)
    expect(notifications.value).toHaveLength(1)
  })

  it('should clear timeout when toast is removed manually before auto-removal', () => {
    const { addToast, removeToast, notifications } = useToastNotifications()
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    addToast('Manual then auto', 'info', 5000)
    const id = notifications.value[0].id

    removeToast(id)
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })

  it('should do nothing when removing a non-existent toast id', () => {
    const { addToast, removeToast, notifications } = useToastNotifications()
    addToast('Exists')

    removeToast(99999) // Non-existent ID
    expect(notifications.value).toHaveLength(1)
  })
})
