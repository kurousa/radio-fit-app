import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  registerServiceWorker,
  requestNotificationPermission,
  scheduleNotification,
  cancelNotification,
} from '../notificationService'

describe('notificationService', () => {
  const mockPostMessage = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator object
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue({ scope: '/' }),
          ready: Promise.resolve({
            active: {
              postMessage: mockPostMessage,
            },
          }),
        },
      },
      writable: true,
    })

    // Mock Notification object
    Object.defineProperty(global, 'Notification', {
      value: {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })
  })

  it('should call navigator.serviceWorker.register', async () => {
    await registerServiceWorker()
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
  })

  it('should call Notification.requestPermission', async () => {
    const permission = await requestNotificationPermission()
    expect(Notification.requestPermission).toHaveBeenCalled()
    expect(permission).toBe('granted')
  })

  it('should post a message to the service worker to schedule a notification', async () => {
    const time = '10:00'
    await scheduleNotification(time)
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'SCHEDULE_NOTIFICATION',
      time,
    })
  })

  it('should post a message to the service worker to cancel notifications', async () => {
    await cancelNotification()
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'CANCEL_NOTIFICATION',
    })
  })
})
