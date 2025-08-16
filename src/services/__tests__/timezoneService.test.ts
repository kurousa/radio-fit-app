/**
 * TimezoneService のテスト
 */

import { describe, it, expect, vi } from 'vitest'
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
})

describe('TimezoneErrorHandler', () => {
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
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    TimezoneErrorHandler.showUserNotification('Test message')

    expect(consoleSpy).toHaveBeenCalledWith('User Notification:', 'Test message')

    consoleSpy.mockRestore()
  })
})
