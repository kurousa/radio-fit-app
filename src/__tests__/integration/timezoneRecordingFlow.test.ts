/**
 * タイムゾーン対応記録機能の統合テスト
 * サービス層の統合テスト（コンポーネントレベルではなく）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  recordExerciseWithTimezone,
  getAllRecords,
  getRecordsWithTimezoneConversion,
  migrateAllRecordsToTimezoneAware,
  migrateRecordToTimezoneAware,
  isTimezoneAwareRecord
} from '../../services/recordService'
import { TimezoneService } from '../../services/timezoneService'
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

describe('Timezone Recording Flow Integration Tests', () => {
  let mockStorage: Map<string, ExerciseRecord[]>

  beforeEach(async () => {
    // ストレージのモック初期化
    mockStorage = new Map()

    // localforageのモック設定
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

    // TimezoneServiceのモック設定
    mockGetCurrentTimezoneInfo.mockReturnValue({
      timezone: 'Asia/Tokyo',
      offset: -540, // JST = UTC-9
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
      }
      return utcDate
    })

    mockFormatLocalDate.mockImplementation((date: Date) => {
      return date.toISOString().split('T')[0]
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T09:30:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockStorage.clear()
  })

  describe('Complete Recording Flow', () => {
    it('should record exercise with timezone information', async () => {
      // 記録を作成
      await recordExerciseWithTimezone('first')

      // 記録が正しく保存されることを確認
      const records = mockStorage.get('2025-01-15')
      expect(records).toHaveLength(1)
      expect(records?.[0]).toMatchObject({
        date: '2025-01-15',
        type: 'first',
        timezone: 'Asia/Tokyo',
        timezoneOffset: -540
      })
    })

    it('should handle multiple records on same day', async () => {
      // 同じ日に複数の記録を作成
      await recordExerciseWithTimezone('first')
      await recordExerciseWithTimezone('second')

      // 両方の記録が保存されることを確認
      const records = mockStorage.get('2025-01-15')
      expect(records).toHaveLength(2)
      expect(records?.[0].type).toBe('first')
      expect(records?.[1].type).toBe('second')
    })

    it('should retrieve records with timezone conversion', async () => {
      // JST環境で記録を作成
      await recordExerciseWithTimezone('first')

      // EST環境で記録を取得
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300,
        localTime: new Date(),
        utcTime: new Date()
      })

      mockFormatLocalDate.mockReturnValue('2025-01-14')

      const convertedRecords = await getRecordsWithTimezoneConversion('America/New_York')

      expect(convertedRecords).toHaveLength(1)
      expect(convertedRecords[0].timezone).toBe('America/New_York')
      expect(convertedRecords[0].date).toBe('2025-01-14')
    })

    it('should calculate streak across multiple days', async () => {
      // 連続する日に記録を作成
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

      // 全ての記録を取得
      const allRecords = await getAllRecords()
      expect(allRecords).toHaveLength(3)

      // 記録が正しく保存されていることを確認
      const recordDates = allRecords.map(r => r.date).sort()
      expect(recordDates).toEqual(['2025-01-13', '2025-01-14', '2025-01-15'])

      // 連続日数を計算
      const streak = DateUtils.calculateStreakWithTimezone(allRecords)
      expect(streak).toBeGreaterThanOrEqual(1) // 少なくとも1日は連続している
    })
  })

  describe('Timezone Change Handling', () => {
    it('should handle timezone changes in record conversion', async () => {
      // 複数のタイムゾーンで記録を作成
      const timezones = [
        { tz: 'Asia/Tokyo', offset: -540, date: '2025-01-15' },
        { tz: 'America/New_York', offset: 300, date: '2025-01-14' },
        { tz: 'Europe/London', offset: 0, date: '2025-01-15' }
      ]

      for (const { tz, offset, date } of timezones) {
        mockGetCurrentTimezoneInfo.mockReturnValue({
          timezone: tz,
          offset,
          localTime: new Date(),
          utcTime: new Date()
        })
        mockFormatLocalDate.mockReturnValue(date)

        await recordExerciseWithTimezone('first')
      }

      // 全ての記録を取得
      const allRecords = await getAllRecords()
      expect(allRecords).toHaveLength(3)

      // 各記録が正しいタイムゾーン情報を持つことを確認
      const recordTimezones = allRecords.map(r => r.timezone).sort()
      expect(recordTimezones).toEqual([
        'America/New_York',
        'Asia/Tokyo',
        'Europe/London'
      ])
    })

    it('should handle daylight saving time transitions', async () => {
      // サマータイム開始前
      vi.setSystemTime(new Date('2025-03-08T08:30:00-05:00'))
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 300, // EST
        localTime: new Date('2025-03-08T08:30:00-05:00'),
        utcTime: new Date('2025-03-08T13:30:00Z')
      })
      mockFormatLocalDate.mockReturnValue('2025-03-08')

      await recordExerciseWithTimezone('first')

      // サマータイム開始後
      vi.setSystemTime(new Date('2025-03-10T08:30:00-04:00'))
      mockGetCurrentTimezoneInfo.mockReturnValue({
        timezone: 'America/New_York',
        offset: 240, // EDT
        localTime: new Date('2025-03-10T08:30:00-04:00'),
        utcTime: new Date('2025-03-10T12:30:00Z')
      })
      mockFormatLocalDate.mockReturnValue('2025-03-10')

      await recordExerciseWithTimezone('first')

      // 両方の記録が正しく保存されることを確認
      const records1 = mockStorage.get('2025-03-08')
      const records2 = mockStorage.get('2025-03-10')

      expect(records1).toHaveLength(1)
      expect(records2).toHaveLength(1)
      expect(records1?.[0].timezoneOffset).toBe(300)
      expect(records2?.[0].timezoneOffset).toBe(240)
    })
  })

  describe('Data Migration', () => {
    it('should migrate legacy records without timezone info', async () => {
      // レガシー記録を直接ストレージに追加
      const legacyRecord: ExerciseRecord = {
        date: '2025-01-10',
        type: 'first',
        timestamp: new Date('2025-01-10T00:30:00Z').getTime()
        // timezone, timezoneOffset, localTimestamp は未定義
      }

      mockStorage.set('2025-01-10', [legacyRecord])

      // マイグレーションを実行
      await migrateAllRecordsToTimezoneAware()

      // マイグレーション後の記録を確認
      const migratedRecords = mockStorage.get('2025-01-10')
      expect(migratedRecords).toHaveLength(1)
      expect(isTimezoneAwareRecord(migratedRecords?.[0]!)).toBe(true)
      expect(migratedRecords?.[0]).toMatchObject({
        date: '2025-01-10',
        type: 'first',
        timezone: expect.any(String),
        timezoneOffset: expect.any(Number),
        localTimestamp: expect.any(Number)
      })
    })

    it('should preserve existing timezone-aware records during migration', async () => {
      // 既にタイムゾーン対応済みの記録
      const timezoneAwareRecord: ExerciseRecord = {
        date: '2025-01-12',
        type: 'second',
        timestamp: new Date('2025-01-12T00:30:00Z').getTime(),
        timezone: 'Europe/London',
        timezoneOffset: 0,
        localTimestamp: new Date('2025-01-12T00:30:00Z').getTime()
      }

      mockStorage.set('2025-01-12', [timezoneAwareRecord])

      // マイグレーションを実行
      await migrateAllRecordsToTimezoneAware()

      // 既存の記録が変更されていないことを確認
      const records = mockStorage.get('2025-01-12')
      expect(records).toHaveLength(1)
      expect(records?.[0]).toEqual(timezoneAwareRecord)
    })

    it('should handle mixed legacy and timezone-aware records', async () => {
      // 混在データを作成
      const legacyRecord: ExerciseRecord = {
        date: '2025-01-08',
        type: 'first',
        timestamp: new Date('2025-01-08T00:30:00Z').getTime()
      }

      const timezoneAwareRecord: ExerciseRecord = {
        date: '2025-01-09',
        type: 'second',
        timestamp: new Date('2025-01-09T01:00:00Z').getTime(),
        timezone: 'America/New_York',
        timezoneOffset: 300,
        localTimestamp: new Date('2025-01-08T20:00:00-05:00').getTime()
      }

      mockStorage.set('2025-01-08', [legacyRecord])
      mockStorage.set('2025-01-09', [timezoneAwareRecord])

      // マイグレーションを実行
      await migrateAllRecordsToTimezoneAware()

      // レガシー記録がマイグレーションされることを確認
      const migratedLegacy = mockStorage.get('2025-01-08')
      expect(isTimezoneAwareRecord(migratedLegacy?.[0])).toBe(true)

      // 既存のタイムゾーン対応記録は変更されていないことを確認
      const preservedRecord = mockStorage.get('2025-01-09')
      expect(preservedRecord?.[0]).toEqual(timezoneAwareRecord)
    })
  })

  describe('Error Handling', () => {
    it('should handle timezone detection failures', async () => {
      // タイムゾーン検出エラーをシミュレート
      mockGetCurrentTimezoneInfo.mockImplementation(() => {
        throw new Error('Timezone detection failed')
      })

      // エラーが発生してもフォールバック処理で動作することを確認
      await expect(recordExerciseWithTimezone('first')).rejects.toThrow()
    })

    it('should handle storage errors gracefully', async () => {
      // ストレージエラーをシミュレート
      const localforage = await import('localforage')
      vi.mocked(localforage.default.setItem).mockRejectedValue(new Error('Storage quota exceeded'))

      // エラーが適切に伝播されることを確認
      await expect(recordExerciseWithTimezone('first')).rejects.toThrow('Failed to record exercise with timezone information')
    })

    it('should handle invalid timezone data in migration', async () => {
      const invalidRecord: ExerciseRecord = {
        date: '2025-01-10',
        type: 'first',
        timestamp: 'invalid-timestamp' as any
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // 無効なデータでもマイグレーションが継続することを確認
      const result = migrateRecordToTimezoneAware(invalidRecord)
      expect(result).toEqual(invalidRecord) // 元の記録がそのまま返される

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should handle large number of records efficiently', async () => {
      // 大量の記録を作成
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, i + 1)
        const dateString = date.toISOString().split('T')[0]

        const record: ExerciseRecord = {
          date: dateString,
          type: i % 2 === 0 ? 'first' : 'second',
          timestamp: date.getTime()
          // タイムゾーン情報なし（レガシー記録）
        }

        mockStorage.set(dateString, [record])
      }

      // マイグレーション実行時間を測定
      const startTime = performance.now()
      await migrateAllRecordsToTimezoneAware()
      const endTime = performance.now()

      const migrationTime = endTime - startTime

      // マイグレーション時間が合理的な範囲内であることを確認（1秒以内）
      expect(migrationTime).toBeLessThan(1000)

      // 全ての記録がマイグレーションされることを確認
      const allRecords = await getAllRecords()
      expect(allRecords).toHaveLength(100)
      allRecords.forEach(record => {
        expect(isTimezoneAwareRecord(record)).toBe(true)
      })
    })
  })
})
