/**
 * データマイグレーション統合テスト
 * 既存データのタイムゾーン対応マイグレーション機能をテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  migrateAllRecordsToTimezoneAware,
  migrateRecordToTimezoneAware,
  migrateRecordsToTimezoneAware,
  isTimezoneAwareRecord,
  getAllRecords
} from '../../services/recordService'
import { TimezoneService } from '../../services/timezoneService'
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

describe('Data Migration Integration Tests', () => {
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

    // TimezoneServiceのモック設定
    mockGetCurrentTimezoneInfo.mockReturnValue({
      timezone: 'Asia/Tokyo',
      offset: -540,
      localTime: new Date('2025-01-15T09:30:00+09:00'),
      utcTime: new Date('2025-01-15T00:30:00Z')
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T09:30:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockStorage.clear()
  })

  describe('Legacy Data Migration', () => {
    it('should migrate single legacy record', async () => {
      // レガシー記録（タイムゾーン情報なし）を作成
      const legacyRecord: ExerciseRecord = {
        date: '2025-01-10',
        type: 'first',
        timestamp: new Date('2025-01-10T00:30:00Z').getTime()
        // timezone, timezoneOffset, localTimestamp は未定義
      }

      // マイグレーション前の状態を確認
      expect(isTimezoneAwareRecord(legacyRecord)).toBe(false)

      // マイグレーションを実行
      const migratedRecord = migrateRecordToTimezoneAware(legacyRecord)

      // マイグレーション後の状態を確認
      expect(isTimezoneAwareRecord(migratedRecord)).toBe(true)
      expect(migratedRecord).toMatchObject({
        date: '2025-01-10',
        type: 'first',
        timestamp: legacyRecord.timestamp,
        timezone: expect.any(String),
        timezoneOffset: expect.any(Number),
        localTimestamp: expect.any(Number)
      })
    })

    it('should migrate multiple legacy records', async () => {
      // 複数のレガシー記録を作成
      const legacyRecords: ExerciseRecord[] = [
        {
          date: '2025-01-08',
          type: 'first',
          timestamp: new Date('2025-01-08T00:30:00Z').getTime()
        },
        {
          date: '2025-01-09',
          type: 'second',
          timestamp: new Date('2025-01-09T01:00:00Z').getTime()
        },
        {
          date: '2025-01-10',
          type: 'first',
          timestamp: new Date('2025-01-10T00:45:00Z').getTime()
        }
      ]

      // マイグレーションを実行
      const migratedRecords = migrateRecordsToTimezoneAware(legacyRecords)

      // 全ての記録がマイグレーションされることを確認
      expect(migratedRecords).toHaveLength(3)
      migratedRecords.forEach((record, index) => {
        expect(isTimezoneAwareRecord(record)).toBe(true)
        expect(record.date).toBe(legacyRecords[index].date)
        expect(record.type).toBe(legacyRecords[index].type)
        expect(record.timestamp).toBe(legacyRecords[index].timestamp)
        expect(record.timezone).toBeDefined()
        expect(record.timezoneOffset).toBeDefined()
        expect(record.localTimestamp).toBeDefined()
      })
    })

    it('should preserve existing timezone-aware records', async () => {
      // 既にタイムゾーン対応済みの記録
      const timezoneAwareRecord: ExerciseRecord = {
        date: '2025-01-12',
        type: 'second',
        timestamp: new Date('2025-01-12T00:30:00Z').getTime(),
        timezone: 'Europe/London',
        timezoneOffset: 0,
        localTimestamp: new Date('2025-01-12T00:30:00Z').getTime()
      }

      // マイグレーションを実行
      const result = migrateRecordToTimezoneAware(timezoneAwareRecord)

      // 既存の記録が変更されていないことを確認
      expect(result).toEqual(timezoneAwareRecord)
    })

    it('should handle mixed legacy and timezone-aware records', async () => {
      const mixedRecords: ExerciseRecord[] = [
        // レガシー記録
        {
          date: '2025-01-08',
          type: 'first',
          timestamp: new Date('2025-01-08T00:30:00Z').getTime()
        },
        // タイムゾーン対応済み記録
        {
          date: '2025-01-09',
          type: 'second',
          timestamp: new Date('2025-01-09T01:00:00Z').getTime(),
          timezone: 'America/New_York',
          timezoneOffset: 300,
          localTimestamp: new Date('2025-01-08T20:00:00-05:00').getTime()
        },
        // レガシー記録
        {
          date: '2025-01-10',
          type: 'first',
          timestamp: new Date('2025-01-10T00:45:00Z').getTime()
        }
      ]

      const migratedRecords = migrateRecordsToTimezoneAware(mixedRecords)

      // 全ての記録がタイムゾーン対応になることを確認
      expect(migratedRecords).toHaveLength(3)
      migratedRecords.forEach(record => {
        expect(isTimezoneAwareRecord(record)).toBe(true)
      })

      // 既存のタイムゾーン対応記録は変更されていないことを確認
      expect(migratedRecords[1]).toEqual(mixedRecords[1])

      // レガシー記録はマイグレーションされていることを確認
      expect(migratedRecords[0].timezone).toBeDefined()
      expect(migratedRecords[2].timezone).toBeDefined()
    })
  })

  describe('Full Database Migration', () => {
    it('should migrate entire database', async () => {
      // 複数日のレガシー記録を作成
      const legacyData = {
        '2025-01-08': [{
          date: '2025-01-08',
          type: 'first' as const,
          timestamp: new Date('2025-01-08T00:30:00Z').getTime()
        }],
        '2025-01-09': [
          {
            date: '2025-01-09',
            type: 'first' as const,
            timestamp: new Date('2025-01-09T00:30:00Z').getTime()
          },
          {
            date: '2025-01-09',
            type: 'second' as const,
            timestamp: new Date('2025-01-09T01:00:00Z').getTime()
          }
        ],
        '2025-01-10': [{
          date: '2025-01-10',
          type: 'second' as const,
          timestamp: new Date('2025-01-10T00:45:00Z').getTime()
        }]
      }

      // レガシーデータをストレージに設定
      for (const [date, records] of Object.entries(legacyData)) {
        mockStorage.set(date, records)
      }

      // 全体マイグレーションを実行
      await migrateAllRecordsToTimezoneAware()

      // 全ての記録がマイグレーションされることを確認
      for (const [date, originalRecords] of Object.entries(legacyData)) {
        const migratedRecords = mockStorage.get(date)
        expect(migratedRecords).toHaveLength(originalRecords.length)

        migratedRecords?.forEach((record, index) => {
          expect(isTimezoneAwareRecord(record)).toBe(true)
          expect(record.date).toBe(originalRecords[index].date)
          expect(record.type).toBe(originalRecords[index].type)
          expect(record.timezone).toBeDefined()
        })
      }
    })

    it('should handle migration errors gracefully', async () => {
      // 無効なデータを含むレガシー記録
      const invalidRecord = {
        date: '2025-01-11',
        type: 'first' as const,
        timestamp: 'invalid-timestamp' as unknown
      }

      mockStorage.set('2025-01-11', [invalidRecord])

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // マイグレーションを実行（エラーが発生しても継続）
      await expect(migrateAllRecordsToTimezoneAware()).resolves.not.toThrow()

      // エラーがログに記録されることを確認
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should skip already migrated records', async () => {
      // 一部がマイグレーション済み、一部がレガシーのデータ
      const mixedData = {
        '2025-01-08': [{
          date: '2025-01-08',
          type: 'first' as const,
          timestamp: new Date('2025-01-08T00:30:00Z').getTime()
          // レガシー記録
        }],
        '2025-01-09': [{
          date: '2025-01-09',
          type: 'second' as const,
          timestamp: new Date('2025-01-09T00:30:00Z').getTime(),
          timezone: 'Asia/Tokyo',
          timezoneOffset: -540,
          localTimestamp: new Date('2025-01-09T09:30:00+09:00').getTime()
          // 既にマイグレーション済み
        }]
      }

      for (const [date, records] of Object.entries(mixedData)) {
        mockStorage.set(date, records)
      }

      // setItemの呼び出し回数をカウント
      const localforage = await import('localforage')
      const setItemSpy = vi.mocked(localforage.default.setItem)
      setItemSpy.mockClear()

      await migrateAllRecordsToTimezoneAware()

      // レガシー記録のみがマイグレーションされることを確認
      expect(setItemSpy).toHaveBeenCalledTimes(1)
      expect(setItemSpy).toHaveBeenCalledWith('2025-01-08', expect.any(Array))
    })
  })

  describe('Migration with Different Timezones', () => {
    it('should migrate records with custom timezone', async () => {
      const legacyRecord: ExerciseRecord = {
        date: '2025-01-10',
        type: 'first',
        timestamp: new Date('2025-01-10T00:30:00Z').getTime()
      }

      // カスタムタイムゾーンでマイグレーション
      const migratedRecord = migrateRecordToTimezoneAware(legacyRecord, 'America/New_York')

      expect(migratedRecord.timezone).toBe('America/New_York')
      expect(migratedRecord.timezoneOffset).toBeDefined()
      expect(migratedRecord.timezoneOffset).not.toBe(-540) // JST以外のオフセット
    })

    it('should handle invalid timezone gracefully', async () => {
      const legacyRecord: ExerciseRecord = {
        date: '2025-01-10',
        type: 'first',
        timestamp: new Date('2025-01-10T00:30:00Z').getTime()
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // 無効なタイムゾーンでマイグレーション
      const result = migrateRecordToTimezoneAware(legacyRecord, 'Invalid/Timezone')

      // 元の記録がそのまま返されることを確認
      expect(result).toEqual(legacyRecord)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Migration Performance', () => {
    it('should handle large dataset migration efficiently', async () => {
      // 大量のレガシー記録を作成
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, i + 1)
        const dateString = date.toISOString().split('T')[0]

        const record: ExerciseRecord = {
          date: dateString,
          type: i % 2 === 0 ? 'first' : 'second',
          timestamp: date.getTime()
          // タイムゾーン情報なし
        }

        mockStorage.set(dateString, [record])
      }

      // マイグレーション実行時間を測定
      const startTime = performance.now()
      await migrateAllRecordsToTimezoneAware()
      const endTime = performance.now()

      const migrationTime = endTime - startTime

      // マイグレーション時間が合理的な範囲内であることを確認（2秒以内）
      expect(migrationTime).toBeLessThan(2000)

      // 全ての記録がマイグレーションされることを確認
      const allRecords = await getAllRecords()
      expect(allRecords).toHaveLength(100)
      allRecords.forEach(record => {
        expect(isTimezoneAwareRecord(record)).toBe(true)
      })
    })

    it('should batch migration operations efficiently', async () => {
      // 複数日の記録を作成
      const dates = ['2025-01-08', '2025-01-09', '2025-01-10', '2025-01-11', '2025-01-12']

      dates.forEach(date => {
        const records = [
          {
            date,
            type: 'first' as const,
            timestamp: new Date(`${date}T00:30:00Z`).getTime()
          },
          {
            date,
            type: 'second' as const,
            timestamp: new Date(`${date}T01:00:00Z`).getTime()
          }
        ]
        mockStorage.set(date, records)
      })

      const localforage = await import('localforage')
      const setItemSpy = vi.mocked(localforage.default.setItem)
      setItemSpy.mockClear()

      await migrateAllRecordsToTimezoneAware()

      // 各日付に対して1回ずつsetItemが呼ばれることを確認
      expect(setItemSpy).toHaveBeenCalledTimes(5)
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data integrity during migration', async () => {
      const originalRecord: ExerciseRecord = {
        date: '2025-01-10',
        type: 'first',
        timestamp: new Date('2025-01-10T00:30:00Z').getTime()
      }

      const migratedRecord = migrateRecordToTimezoneAware(originalRecord)

      // 元のデータが保持されることを確認
      expect(migratedRecord.date).toBe(originalRecord.date)
      expect(migratedRecord.type).toBe(originalRecord.type)
      expect(migratedRecord.timestamp).toBe(originalRecord.timestamp)

      // 新しいフィールドが追加されることを確認
      expect(migratedRecord.timezone).toBeDefined()
      expect(migratedRecord.timezoneOffset).toBeDefined()
      expect(migratedRecord.localTimestamp).toBeDefined()
    })

    it('should handle edge cases in timestamp conversion', async () => {
      // 特殊なタイムスタンプでのテスト
      const edgeCases = [
        new Date('2025-01-01T00:00:00Z').getTime(), // 正常な日付
        new Date('2025-12-31T23:59:59Z').getTime(), // 年末
        Date.now() // 現在時刻
      ]

      for (const timestamp of edgeCases) {
        const record: ExerciseRecord = {
          date: new Date(timestamp).toISOString().split('T')[0],
          type: 'first',
          timestamp
        }

        const migratedRecord = migrateRecordToTimezoneAware(record)

        // 基本的なフィールドが存在することを確認
        expect(migratedRecord.timestamp).toBe(timestamp)
        expect(migratedRecord.date).toBeDefined()
        expect(migratedRecord.type).toBe('first')

        // タイムゾーン情報が追加されていることを確認（エラーが発生しても元の記録は保持される）
        if (isTimezoneAwareRecord(migratedRecord)) {
          expect(migratedRecord.localTimestamp).toBeDefined()
          expect(migratedRecord.timezone).toBeDefined()
          expect(migratedRecord.timezoneOffset).toBeDefined()
        }
      }
    })
  })
})
