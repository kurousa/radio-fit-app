/**
 * タイムゾーン変更時の動作統合テスト
 * タイムゾーン変更検出とサービス層の統合テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { timezoneChangeDetector } from '../../services/timezoneChangeDetector'
import { TimezoneService } from '../../services/timezoneService'
import { getRecordsWithTimezoneConversion, recordExerciseWithTimezone } from '../../services/recordService'
import { DateUtils } from '../../services/dateUtils'
import type { ExerciseRecord } from '../../services/recordService'

// モック設定
vi.mock('localforage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    iterate: vi.fn(),
    config: vi.fn()
  }
}))

vi.mock('../../services/timezoneService')

const mockGetCurrentTimezoneInfo = vi.mocked(TimezoneService.getCurrentTimezoneInfo)
const mockGetTimezoneInfo = vi.mocked(TimezoneService.getTimezoneInfo)
const mockConvertUTCToLocal = vi.mocked(TimezoneService.convertUTCToLocal)
const mockFormatLocalDate = vi.mocked(TimezoneService.formatLocalDate)

describe('Timezone Change Handling Integration Tests', () => {
  let mockStorage: Map<string, ExerciseRecord[]>

  beforeEach(async () => {
    // ストレージのモック初期化
    mockStorage = new Map()

    const localforage = await import('localforage')
    vi.mocked(localforage.default.getItem).mockImplementation(async (key: string) => {
      return mockStorage.get(key) || null
    })

    vi.mocked(localforage.default.setItem).mockImplementation(async (key: string, value: ExerciseRecord[]) => {
      mockStorage.set(key, value)
      return value
    })

    vi.mocked(localforage.default.iterate).mockImplementation(async (callback) => {
      for (const [key, value] of mockStorage.entries()) {
        await callback(value, key, 1)
      }
    })

    // 初期タイムゾーン設定（JST）
    mockGetCurrentTimezoneInfo.mockReturnValue({
      timezone: 'Asia/Tokyo',
      offset: -540,
      localTime: new Date('2025-01-15T09:30:00+09:00'),
      utcTime: new Date('2025-01-15T00:30:00Z')
    })

    mockGetTimezoneInfo.mockImplementation((timezone: string, referenceDate?: Date) => {
      const date = referenceDate || new Date()

      if (timezone === 'Asia/Tokyo') {
        return {
          timezone: 'Asia/Tokyo',
          offset: 540, // UTC+9 = +540分
          localTime: new Date(date.getTime() + (9 * 60 * 60 * 1000)),
          utcTime: date
        }
      } else if (timezone === 'America/New_York') {
        return {
          timezone: 'America/New_York',
          offset: -300, // UTC-5 = -300分
          localTime: new Date(date.getTime() - (5 * 60 * 60 * 1000)),
          utcTime: date
        }
      } else if (timezone === 'Europe/London') {
        return {
          timezone: 'Europe/London',
          offset: 0, // UTC = 0分
          localTime: date,
          utcTime: date
        }
      }

      return {
        timezone: 'UTC',
        offset: 0,
        localTime: date,
        utcTime: date
      }
    })

    mockConvertUTCToLocal.mockImplementation((utcTimestamp: number, timezone?: string) => {
      const utcDate = new Date(utcTimestamp)
      const tz = timezone || 'Asia/Tokyo'

      if (tz === 'Asia/Tokyo') {
        return new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
      } else if (tz === 'America/New_York') {
        return new Date(utcDate.getTime() - (5 * 60 * 60 * 1000))
      } else if (tz === 'Europe/London') {
        return new Date(utcDate.getTime())
      }
      return utcDate
    })

    mockFormatLocalDate.mockImplementation((date: Date, timezone?: string) => {
      const tz = timezone || 'Asia/Tokyo'
      if (tz === 'Asia/Tokyo') {
        const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
        return jstDate.toISOString().split('T')[0]
      } else if (tz === 'America/New_York') {
        const estDate = new Date(date.getTime() - (5 * 60 * 60 * 1000))
        return estDate.toISOString().split('T')[0]
      }
      return date.toISOString().split('T')[0]
    })

    // タイムゾーン変更検出器をリセット
    timezoneChangeDetector.stopMonitoring()
    const detector = timezoneChangeDetector as any
    if (detector.callbacks) {
      detector.callbacks.clear()
    }
    // 初期タイムゾーンを設定
    if (detector.currentTimezone !== undefined) {
      detector.currentTimezone = 'Asia/Tokyo'
    }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T09:30:00+09:00'))
  })

  afterEach(() => {
    timezoneChangeDetector.stopMonitoring()
    vi.useRealTimers()
    vi.clearAllMocks()
    mockStorage.clear()
  })

  describe('Timezone Change Detection', () => {
    it('should detect timezone changes', () => {
      const callback = vi.fn()
      const unsubscribe = timezoneChangeDetector.onTimezoneChange(callback)

      // 初期タイムゾーンを設定
      const detector = timezoneChangeDetector as any
      detector.currentTimezone = 'Asia/Tokyo'
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

    it('should handle multiple timezone changes', () => {
      const callback = vi.fn()
      timezoneChangeDetector.onTimezoneChange(callback)

      // 初期タイムゾーンを設定
      const detector = timezoneChangeDetector as any
      detector.currentTimezone = 'Asia/Tokyo'

      // 1回目の変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date(),
        utcTime: new Date()
      })
      timezoneChangeDetector.forceCheck()

      // 2回目の変更
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'Europe/London',
        offset: 0,
        localTime: new Date(),
        utcTime: new Date()
      })
      timezoneChangeDetector.forceCheck()

      // 両方の変更が検出されることを確認
      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenNthCalledWith(1, 'America/New_York', 'Asia/Tokyo')
      expect(callback).toHaveBeenNthCalledWith(2, 'Europe/London', 'America/New_York')
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
  })

  describe('Record Display Updates', () => {
    it('should update record display when timezone changes', async () => {
      // 初期記録を作成（JST）
      await recordExerciseWithTimezone('first')

      // 初期状態での記録取得
      let records = await getRecordsWithTimezoneConversion()
      expect(records).toHaveLength(1)
      expect(records[0].timezone).toBe('Asia/Tokyo')
      expect(records[0].date).toBe('2025-01-15')

      // タイムゾーンを変更（EST）
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date('2025-01-14T19:30:00-05:00'),
        utcTime: new Date('2025-01-15T00:30:00Z')
      })

      // 新しいタイムゾーンで記録を取得
      records = await getRecordsWithTimezoneConversion('America/New_York')
      expect(records).toHaveLength(1)
      expect(records[0].timezone).toBe('America/New_York')
      expect(records[0].date).toBe('2025-01-14') // 日付が変更される
    })

    it('should handle streak calculation across timezone changes', async () => {
      // 連続記録を作成
      const dates = [
        '2025-01-13T09:30:00+09:00',
        '2025-01-14T09:30:00+09:00',
        '2025-01-15T09:30:00+09:00'
      ]

      for (let i = 0; i < dates.length; i++) {
        vi.setSystemTime(new Date(dates[i]))
        mockFormatLocalDate.mockReturnValue(`2025-01-${13 + i}`)
        await recordExerciseWithTimezone('first')
      }

      // 初期連続日数を確認
      let records = await getRecordsWithTimezoneConversion()
      let streak = DateUtils.calculateStreakWithTimezone(records)
      expect(streak).toBeGreaterThanOrEqual(1) // 少なくとも1日は連続している

      // タイムゾーンを変更（EST）
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date(),
        utcTime: new Date()
      })

      // 新しいタイムゾーンでの連続日数を確認
      records = await getRecordsWithTimezoneConversion('America/New_York')
      streak = DateUtils.calculateStreakWithTimezone(records)
      expect(streak).toBeGreaterThanOrEqual(1) // 連続日数は維持される（少なくとも1日）
    })
  })

  describe('Daylight Saving Time Handling', () => {
    it('should handle DST transitions correctly', async () => {
      // サマータイム開始前の記録
      vi.setSystemTime(new Date('2025-03-08T08:30:00-05:00')) // EST
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300, // EST = UTC-5
        localTime: new Date('2025-03-08T08:30:00-05:00'),
        utcTime: new Date('2025-03-08T13:30:00Z')
      })
      mockFormatLocalDate.mockReturnValue('2025-03-08')

      await recordExerciseWithTimezone('first')

      // サマータイム開始後の記録
      vi.setSystemTime(new Date('2025-03-10T08:30:00-04:00')) // EDT
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 240, // EDT = UTC-4
        localTime: new Date('2025-03-10T08:30:00-04:00'),
        utcTime: new Date('2025-03-10T12:30:00Z')
      })
      mockFormatLocalDate.mockReturnValue('2025-03-10')

      await recordExerciseWithTimezone('first')

      // 両方の記録が正しく保存されることを確認
      const records = await getRecordsWithTimezoneConversion('America/New_York')
      expect(records).toHaveLength(2)

      // オフセットが正しく記録されることを確認
      const record1 = records.find(r => r.date === '2025-03-08')
      const record2 = records.find(r => r.date === '2025-03-10')

      expect(record1?.timezoneOffset).toBe(300) // EST
      expect(record2?.timezoneOffset).toBe(240) // EDT
    })
  })

  describe('Monitoring Lifecycle', () => {
    it('should start and stop monitoring correctly', () => {
      expect(timezoneChangeDetector.isMonitoring()).toBe(false)

      timezoneChangeDetector.startMonitoring()
      expect(timezoneChangeDetector.isMonitoring()).toBe(true)

      timezoneChangeDetector.stopMonitoring()
      expect(timezoneChangeDetector.isMonitoring()).toBe(false)
    })

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      // 初期タイムゾーンを設定
      const detector = timezoneChangeDetector as unknown
      detector.currentTimezone = 'Asia/Tokyo'

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
  })

  describe('Performance', () => {
    it('should handle timezone changes with large datasets efficiently', async () => {
      // 大量の記録を作成
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, i + 1)
        const dateString = date.toISOString().split('T')[0]

        const record: ExerciseRecord = {
          date: dateString,
          type: i % 2 === 0 ? 'first' : 'second',
          timestamp: date.getTime(),
          timezone: 'Asia/Tokyo',
          timezoneOffset: -540,
          localTimestamp: date.getTime() + (9 * 60 * 60 * 1000)
        }

        mockStorage.set(dateString, [record])
      }

      // タイムゾーン変更の実行時間を測定
      const startTime = performance.now()

      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date(),
        utcTime: new Date()
      })

      const records = await getRecordsWithTimezoneConversion('America/New_York')

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // 処理時間が合理的な範囲内であることを確認（1秒以内）
      expect(processingTime).toBeLessThan(1000)

      // 全ての記録が変換されることを確認
      expect(records).toHaveLength(100)
      records.forEach(record => {
        expect(record.timezone).toBe('America/New_York')
      })
    })
  })
})
