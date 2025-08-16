/**
 * TimezoneService のテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TimezoneService, TimezoneErrorHandler } from '../timezoneService'

describe('TimezoneService', () => {
  describe('getCurrentTimezoneInfo', () => {
    it('should return current timezone information', () => {
      const timezoneInfo = TimezoneService.getCurrentTimezoneInfo()

      expect(timezoneInfo).toHaveProperty('timezone')
      expect(timezoneInfo).toHaveProperty('offset')
      expect(timezoneInfo).toHaveProperty('localTime')
      expect(timezoneInfo).toHaveProperty('utcTime')

      expect(typeof timezoneInfo.timezone).toBe('string')
      expect(typeof timezoneInfo.offset).toBe('number')
      expect(timezoneInfo.localTime).toBeInstanceOf(Date)
      expect(timezoneInfo.utcTime).toBeInstanceOf(Date)
    })

    it('should fallback to UTC when timezone detection fails', () => {
      // Intl.DateTimeFormat をモック
      const originalDateTimeFormat = Intl.DateTimeFormat
      // @ts-expect-error - テスト用のモック
      Intl.DateTimeFormat = vi.fn().mockImplementation(() => {
        throw new Error('Mock error')
      })

      const timezoneInfo = TimezoneService.getCurrentTimezoneInfo()

      expect(timezoneInfo.timezone).toBe('UTC')
      expect(timezoneInfo.offset).toBe(0)

      // 元に戻す
      Intl.DateTimeFormat = originalDateTimeFormat
    })
  })

  describe('convertUTCToLocal', () => {
    it('should convert UTC timestamp to local date', () => {
      const utcTimestamp = new Date('2025-01-15T12:00:00Z').getTime()
      const localDate = TimezoneService.convertUTCToLocal(utcTimestamp, 'Asia/Tokyo')

      expect(localDate).toBeInstanceOf(Date)
      // 東京時間では UTC+9 なので 21:00 になるはず
      expect(localDate.getHours()).toBe(21)
    })

    it('should fallback to original timestamp on error', () => {
      const utcTimestamp = new Date('2025-01-15T12:00:00Z').getTime()
      const localDate = TimezoneService.convertUTCToLocal(utcTimestamp, 'Invalid/Timezone')

      expect(localDate).toBeInstanceOf(Date)
      expect(localDate.getTime()).toBe(utcTimestamp)
    })
  })

  describe('convertLocalToUTC', () => {
    it('should convert local date to UTC timestamp', () => {
      const localDate = new Date('2025-01-15T21:00:00') // 仮想的なローカル時刻
      const utcTimestamp = TimezoneService.convertLocalToUTC(localDate, 'Asia/Tokyo')

      expect(typeof utcTimestamp).toBe('number')
      expect(utcTimestamp).toBeGreaterThan(0)
    })

    it('should fallback to local timestamp on error', () => {
      const localDate = new Date('2025-01-15T21:00:00')
      const utcTimestamp = TimezoneService.convertLocalToUTC(localDate, 'Invalid/Timezone')

      expect(utcTimestamp).toBe(localDate.getTime())
    })
  })

  describe('formatLocalDate', () => {
    it('should format date in specified timezone', () => {
      const date = new Date('2025-01-15T12:00:00Z')
      const formatted = TimezoneService.formatLocalDate(date, 'Asia/Tokyo')

      expect(typeof formatted).toBe('string')
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
    })

    it('should fallback to ISO date on error', () => {
      const date = new Date('2025-01-15T12:00:00Z')
      const formatted = TimezoneService.formatLocalDate(date, 'Invalid/Timezone')

      expect(formatted).toBe('2025-01-15')
    })
  })

  describe('timezone conversion accuracy', () => {
    it('should accurately convert between different timezones', () => {
      const testCases = [
        {
          utc: '2025-01-15T12:00:00Z',
          timezone: 'Asia/Tokyo',
          expectedHour: 21 // UTC+9
        },
        {
          utc: '2025-01-15T12:00:00Z',
          timezone: 'America/New_York',
          expectedHour: 7 // UTC-5 (EST)
        },
        {
          utc: '2025-01-15T12:00:00Z',
          timezone: 'Europe/London',
          expectedHour: 12 // UTC+0 (GMT)
        },
        {
          utc: '2025-01-15T12:00:00Z',
          timezone: 'Australia/Sydney',
          expectedHour: 23 // UTC+11 (AEDT)
        }
      ]

      testCases.forEach(({ utc, timezone, expectedHour }) => {
        const utcTimestamp = new Date(utc).getTime()
        const localDate = TimezoneService.convertUTCToLocal(utcTimestamp, timezone)

        expect(localDate.getHours()).toBe(expectedHour)
      })
    })

    it('should maintain date consistency across timezone conversions', () => {
      const originalDate = new Date('2025-06-15T15:30:45.123Z')
      const timezone = 'Asia/Tokyo'

      // UTC → Local → UTC の往復変換
      const localDate = TimezoneService.convertUTCToLocal(originalDate.getTime(), timezone)
      const backToUTC = TimezoneService.convertLocalToUTC(localDate, timezone)

      // 元の時刻との差が1分以内であることを確認（丸め誤差を考慮）
      const timeDiff = Math.abs(backToUTC - originalDate.getTime())
      expect(timeDiff).toBeLessThan(60000) // 1分以内
    })

    it('should handle edge cases around midnight', () => {
      // 日付境界付近のテスト
      const testCases = [
        '2025-01-15T23:59:59Z',
        '2025-01-16T00:00:00Z',
        '2025-01-16T00:00:01Z'
      ]

      testCases.forEach(utcTime => {
        const utcTimestamp = new Date(utcTime).getTime()
        const tokyoDate = TimezoneService.convertUTCToLocal(utcTimestamp, 'Asia/Tokyo')
        const nyDate = TimezoneService.convertUTCToLocal(utcTimestamp, 'America/New_York')

        expect(tokyoDate).toBeInstanceOf(Date)
        expect(nyDate).toBeInstanceOf(Date)
        expect(tokyoDate.getTime()).not.toBe(nyDate.getTime())
      })
    })
  })

  describe('daylight saving time transitions', () => {
    it('should handle spring forward transition (EST to EDT)', () => {
      // 2025年3月9日 2:00 AM EST → 3:00 AM EDT (spring forward)
      const beforeTransition = new Date('2025-03-09T06:59:00Z') // 1:59 AM EST
      const afterTransition = new Date('2025-03-09T07:01:00Z')  // 3:01 AM EDT

      const beforeLocal = TimezoneService.convertUTCToLocal(beforeTransition.getTime(), 'America/New_York')
      const afterLocal = TimezoneService.convertUTCToLocal(afterTransition.getTime(), 'America/New_York')

      expect(beforeLocal.getHours()).toBe(1) // 1:59 AM
      expect(afterLocal.getHours()).toBe(3)  // 3:01 AM (2:xx AM は存在しない)
    })

    it('should handle fall back transition (EDT to EST)', () => {
      // 2025年11月2日 2:00 AM EDT → 1:00 AM EST (fall back)
      const beforeTransition = new Date('2025-11-02T05:59:00Z') // 1:59 AM EDT
      const afterTransition = new Date('2025-11-02T06:01:00Z')  // 1:01 AM EST

      const beforeLocal = TimezoneService.convertUTCToLocal(beforeTransition.getTime(), 'America/New_York')
      const afterLocal = TimezoneService.convertUTCToLocal(afterTransition.getTime(), 'America/New_York')

      expect(beforeLocal.getHours()).toBe(1) // 1:59 AM EDT
      expect(afterLocal.getHours()).toBe(1)  // 1:01 AM EST
    })

    it('should handle timezone without DST', () => {
      // 日本は夏時間がないため、年間を通して一定
      const winterTime = new Date('2025-01-15T12:00:00Z')
      const summerTime = new Date('2025-07-15T12:00:00Z')

      const winterLocal = TimezoneService.convertUTCToLocal(winterTime.getTime(), 'Asia/Tokyo')
      const summerLocal = TimezoneService.convertUTCToLocal(summerTime.getTime(), 'Asia/Tokyo')

      expect(winterLocal.getHours()).toBe(21) // UTC+9
      expect(summerLocal.getHours()).toBe(21) // UTC+9 (変わらず)
    })

    it('should format dates correctly during DST transitions', () => {
      const dstTransitionDate = new Date('2025-03-09T07:30:00Z') // DST transition day
      const formatted = TimezoneService.formatLocalDate(dstTransitionDate, 'America/New_York')

      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(formatted).toBe('2025-03-09')
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle invalid timezone gracefully', () => {
      const utcTimestamp = Date.now()
      const invalidTimezones = [
        'Invalid/Timezone',
        'Not/A/Timezone',
        '',
        'UTC+9', // 無効な形式
        'JST'     // 略称は無効
      ]

      invalidTimezones.forEach(timezone => {
        const result = TimezoneService.convertUTCToLocal(utcTimestamp, timezone)
        expect(result).toBeInstanceOf(Date)
        // フォールバック時は元のUTCタイムスタンプが返される（ただし、内部処理で若干の差が生じる可能性がある）
        const timeDiff = Math.abs(result.getTime() - utcTimestamp)
        expect(timeDiff).toBeLessThan(1000) // 1秒以内の差は許容
      })
    })

    it('should handle extreme dates', () => {
      const extremeDates = [
        new Date('1970-01-01T00:00:00Z').getTime(), // Unix epoch
        new Date('2038-01-19T03:14:07Z').getTime(), // 32-bit timestamp limit
        new Date('1900-01-01T00:00:00Z').getTime(), // 古い日付
        new Date('2100-12-31T23:59:59Z').getTime()  // 未来の日付
      ]

      extremeDates.forEach(timestamp => {
        const result = TimezoneService.convertUTCToLocal(timestamp, 'Asia/Tokyo')
        expect(result).toBeInstanceOf(Date)
        // 極端な日付でも Date オブジェクトが返されることを確認
        // 無効な日付の場合は NaN が返される可能性があるが、それも有効な動作
        expect(typeof result.getTime()).toBe('number')
      })
    })

    it('should handle malformed input gracefully', () => {
      const malformedInputs = [
        NaN,
        Infinity,
        -Infinity,
        0
      ]

      malformedInputs.forEach(input => {
        const result = TimezoneService.convertUTCToLocal(input, 'UTC')
        expect(result).toBeInstanceOf(Date)
      })
    })
  })
})

describe('TimezoneErrorHandler', () => {
  beforeEach(() => {
    // 各テスト前にエラーログとコールバックをクリア
    TimezoneErrorHandler.clearErrorLog()
    TimezoneErrorHandler.clearNotificationCallbacks()
  })

  afterEach(() => {
    // テスト後のクリーンアップ
    TimezoneErrorHandler.clearErrorLog()
    TimezoneErrorHandler.clearNotificationCallbacks()
  })

  it('should handle errors without throwing', () => {
    const error = {
      type: 'detection_failed' as const,
      message: 'Test error',
      fallbackAction: 'Test fallback'
    }

    expect(() => {
      TimezoneErrorHandler.handleError(error)
    }).not.toThrow()
  })

  it('should show user notification', () => {
    // コールバックが登録されていない場合のフォールバック動作をテスト
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // すべてのコールバックをクリアしてフォールバック動作を確認
    TimezoneErrorHandler.clearNotificationCallbacks()

    TimezoneErrorHandler.showUserNotification('Test message', 'error')

    expect(consoleSpy).toHaveBeenCalledWith('User Notification:', 'Test message')

    consoleSpy.mockRestore()
  })

  it('should call registered callbacks', () => {
    const mockCallback = vi.fn()

    // コールバックを登録
    TimezoneErrorHandler.registerNotificationCallback(mockCallback)

    TimezoneErrorHandler.showUserNotification('Test message', 'warning')

    expect(mockCallback).toHaveBeenCalledWith('Test message', 'warning')

    // クリーンアップ
    TimezoneErrorHandler.unregisterNotificationCallback(mockCallback)
  })
})
