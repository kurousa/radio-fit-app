import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timezoneChangeDetector } from '../../services/timezoneChangeDetector'
import { TimezoneService } from '../../services/timezoneService'

// モック設定
vi.mock('../../services/timezoneService')

const mockGetCurrentTimezoneInfo = vi.mocked(TimezoneService.getCurrentTimezoneInfo)

describe('Timezone Change Integration', () => {
  beforeEach(() => {
    // デフォルトのモック設定
    mockGetCurrentTimezoneInfo.mockReturnValue({
      timezone: 'Asia/Tokyo',
      offset: -540,
      localTime: new Date(),
      utcTime: new Date()
    })

    // シングルトンインスタンスをリセット
    timezoneChangeDetector.stopMonitoring()
    // プライベートプロパティにアクセスするためのタイプアサーション
    const detector = timezoneChangeDetector as any
    if (detector.callbacks && detector.callbacks.clear) {
      detector.callbacks.clear()
    }
    if (detector.currentTimezone !== undefined) {
      detector.currentTimezone = 'Asia/Tokyo'
    }

    // タイマーをモック
    vi.useFakeTimers()
  })

  afterEach(() => {
    timezoneChangeDetector.stopMonitoring()
    // プライベートプロパティにアクセスするためのタイプアサーション
    const detector = timezoneChangeDetector as unknown
    if (detector.callbacks && detector.callbacks.clear) {
      detector.callbacks.clear()
    }
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Timezone change detection', () => {
    it('should detect timezone changes', () => {
      const callback = vi.fn()
      const unsubscribe = timezoneChangeDetector.onTimezoneChange(callback)

      // 初期タイムゾーン
      expect(timezoneChangeDetector.getCurrentTimezone()).toBe('Asia/Tokyo')

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date(),
        utcTime: new Date()
      })

      // タイムゾーン変更を手動でトリガー
      timezoneChangeDetector.forceCheck()

      // コールバックが呼ばれることを確認
      expect(callback).toHaveBeenCalledWith('America/New_York', 'Asia/Tokyo')

      unsubscribe()
    })

    it('should handle timezone detection errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // タイムゾーン検出でエラーを発生させる
      mockGetCurrentTimezoneInfo.mockImplementation(() => {
        throw new Error('Timezone detection failed')
      })

      // エラーが発生してもアプリケーションが継続することを確認
      const timezone = timezoneChangeDetector.getCurrentTimezone()
      expect(timezone).toBe('UTC') // フォールバック

      consoleSpy.mockRestore()
    })

    it('should start and stop monitoring', () => {
      expect(timezoneChangeDetector.isMonitoring()).toBe(false)

      timezoneChangeDetector.startMonitoring()
      expect(timezoneChangeDetector.isMonitoring()).toBe(true)

      timezoneChangeDetector.stopMonitoring()
      expect(timezoneChangeDetector.isMonitoring()).toBe(false)
    })

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = timezoneChangeDetector.onTimezoneChange(callback1)
      const unsubscribe2 = timezoneChangeDetector.onTimezoneChange(callback2)

      expect(timezoneChangeDetector.getCallbackCount()).toBe(2)

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Europe/London',
        offset: 0,
        localTime: new Date(),
        utcTime: new Date()
      })

      timezoneChangeDetector.forceCheck()

      // 両方のコールバックが呼ばれることを確認
      expect(callback1).toHaveBeenCalledWith('Europe/London', 'Asia/Tokyo')
      expect(callback2).toHaveBeenCalledWith('Europe/London', 'Asia/Tokyo')

      unsubscribe1()
      expect(timezoneChangeDetector.getCallbackCount()).toBe(1)

      unsubscribe2()
      expect(timezoneChangeDetector.getCallbackCount()).toBe(0)
    })

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      const normalCallback = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      timezoneChangeDetector.onTimezoneChange(errorCallback)
      timezoneChangeDetector.onTimezoneChange(normalCallback)

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Australia/Sydney',
        offset: -660,
        localTime: new Date(),
        utcTime: new Date()
      })

      timezoneChangeDetector.forceCheck()

      // エラーが発生してもアプリケーションが継続することを確認
      expect(errorCallback).toHaveBeenCalled()
      expect(normalCallback).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Error in timezone change callback:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should detect timezone changes with interval', () => {
      const callback = vi.fn()
      timezoneChangeDetector.onTimezoneChange(callback)

      timezoneChangeDetector.startMonitoring()

      // タイムゾーンを変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Pacific/Auckland',
        offset: -720,
        localTime: new Date(),
        utcTime: new Date()
      })

      // 30秒経過をシミュレート
      vi.advanceTimersByTime(30000)

      // コールバックが呼ばれることを確認
      expect(callback).toHaveBeenCalledWith('Pacific/Auckland', 'Asia/Tokyo')
    })
  })
})
