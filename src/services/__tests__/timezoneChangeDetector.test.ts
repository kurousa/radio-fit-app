import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TimezoneChangeDetector } from '../timezoneChangeDetector'
import { TimezoneService } from '../timezoneService'

// TimezoneServiceをモック
vi.mock('../timezoneService', () => ({
  TimezoneService: {
    getCurrentTimezoneInfo: vi.fn()
  }
}))

describe('TimezoneChangeDetector', () => {
  let detector: TimezoneChangeDetector
  let mockGetCurrentTimezoneInfo: any

  beforeEach(() => {
    // シングルトンインスタンスをリセット
    ;(TimezoneChangeDetector as any).instance = null

    mockGetCurrentTimezoneInfo = vi.mocked(TimezoneService.getCurrentTimezoneInfo)
    mockGetCurrentTimezoneInfo.mockReturnValue({
      timezone: 'Asia/Tokyo',
      offset: -540,
      localTime: new Date(),
      utcTime: new Date()
    })

    detector = TimezoneChangeDetector.getInstance()

    // タイマーをモック
    vi.useFakeTimers()
  })

  afterEach(() => {
    detector.stopMonitoring()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TimezoneChangeDetector.getInstance()
      const instance2 = TimezoneChangeDetector.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getCurrentTimezone', () => {
    it('should return current timezone from TimezoneService', () => {
      const timezone = detector.getCurrentTimezone()
      expect(timezone).toBe('Asia/Tokyo')
      expect(mockGetCurrentTimezoneInfo).toHaveBeenCalled()
    })

    it('should return UTC when TimezoneService fails', () => {
      mockGetCurrentTimezoneInfo.mockImplementation(() => {
        throw new Error('Timezone detection failed')
      })

      const timezone = detector.getCurrentTimezone()
      expect(timezone).toBe('UTC')
    })
  })

  describe('monitoring', () => {
    it('should start monitoring', () => {
      expect(detector.isMonitoring()).toBe(false)

      detector.startMonitoring()
      expect(detector.isMonitoring()).toBe(true)
    })

    it('should stop monitoring', () => {
      detector.startMonitoring()
      expect(detector.isMonitoring()).toBe(true)

      detector.stopMonitoring()
      expect(detector.isMonitoring()).toBe(false)
    })

    it('should not start monitoring twice', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      detector.startMonitoring()
      detector.startMonitoring()

      expect(consoleSpy).toHaveBeenCalledWith('Timezone monitoring is already running')
      consoleSpy.mockRestore()
    })
  })

  describe('timezone change detection', () => {
    it('should detect timezone change and call callbacks', () => {
      const callback = vi.fn()
      detector.onTimezoneChange(callback)

      detector.startMonitoring()

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date(),
        utcTime: new Date()
      })

      // 30秒経過をシミュレート
      vi.advanceTimersByTime(30000)

      expect(callback).toHaveBeenCalledWith('America/New_York', 'Asia/Tokyo')
    })

    it('should not call callbacks when timezone does not change', () => {
      const callback = vi.fn()
      detector.onTimezoneChange(callback)

      detector.startMonitoring()

      // 30秒経過をシミュレート（タイムゾーンは変更なし）
      vi.advanceTimersByTime(30000)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      detector.onTimezoneChange(callback1)
      detector.onTimezoneChange(callback2)

      detector.startMonitoring()

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Europe/London',
        offset: 0,
        localTime: new Date(),
        utcTime: new Date()
      })

      vi.advanceTimersByTime(30000)

      expect(callback1).toHaveBeenCalledWith('Europe/London', 'Asia/Tokyo')
      expect(callback2).toHaveBeenCalledWith('Europe/London', 'Asia/Tokyo')
    })

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      const normalCallback = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      detector.onTimezoneChange(errorCallback)
      detector.onTimezoneChange(normalCallback)

      detector.startMonitoring()

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Europe/London',
        offset: 0,
        localTime: new Date(),
        utcTime: new Date()
      })

      vi.advanceTimersByTime(30000)

      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Error in timezone change callback:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('callback management', () => {
    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = detector.onTimezoneChange(callback)

      expect(detector.getCallbackCount()).toBe(1)

      unsubscribe()
      expect(detector.getCallbackCount()).toBe(0)
    })

    it('should track callback count correctly', () => {
      expect(detector.getCallbackCount()).toBe(0)

      const unsubscribe1 = detector.onTimezoneChange(() => {})
      expect(detector.getCallbackCount()).toBe(1)

      const unsubscribe2 = detector.onTimezoneChange(() => {})
      expect(detector.getCallbackCount()).toBe(2)

      unsubscribe1()
      expect(detector.getCallbackCount()).toBe(1)

      unsubscribe2()
      expect(detector.getCallbackCount()).toBe(0)
    })
  })

  describe('forceCheck', () => {
    it('should manually trigger timezone check', () => {
      const callback = vi.fn()
      detector.onTimezoneChange(callback)

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Australia/Sydney',
        offset: -660,
        localTime: new Date(),
        utcTime: new Date()
      })

      detector.forceCheck()

      expect(callback).toHaveBeenCalledWith('Australia/Sydney', 'Asia/Tokyo')
    })
  })

  describe('visibility change handling', () => {
    it('should check timezone when page becomes visible', () => {
      const callback = vi.fn()
      detector.onTimezoneChange(callback)

      detector.startMonitoring()

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Pacific/Auckland',
        offset: -720,
        localTime: new Date(),
        utcTime: new Date()
      })

      // ページが非表示になる
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))

      expect(callback).not.toHaveBeenCalled()

      // ページが表示される
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))

      expect(callback).toHaveBeenCalledWith('Pacific/Auckland', 'Asia/Tokyo')
    })
  })

  describe('error handling', () => {
    it('should handle timezone detection errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockGetCurrentTimezoneInfo.mockImplementation(() => {
        throw new Error('Detection failed')
      })

      detector.startMonitoring()
      vi.advanceTimersByTime(30000)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to get current timezone:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })
})
