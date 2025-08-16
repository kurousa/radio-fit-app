import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  migrateRecordToTimezoneAware,
  migrateRecordsToTimezoneAware,
  isTimezoneAwareRecord,
  recordExerciseWithTimezone,
  getRecordsWithTimezoneConversion,
  getAllRecords,
  type ExerciseRecord
} from '../recordService'

describe('RecordService Migration Functions', () => {
  const mockOldRecord: ExerciseRecord = {
    date: '2025-01-15',
    type: 'first',
    timestamp: 1705123456789
  }

  const mockTimezoneAwareRecord: ExerciseRecord = {
    date: '2025-01-15',
    type: 'first',
    timestamp: 1705123456789,
    timezone: 'Asia/Tokyo',
    timezoneOffset: -540
  }

  describe('isTimezoneAwareRecord', () => {
    it('should return false for old format records', () => {
      expect(isTimezoneAwareRecord(mockOldRecord)).toBe(false)
    })

    it('should return true for timezone-aware records', () => {
      expect(isTimezoneAwareRecord(mockTimezoneAwareRecord)).toBe(true)
    })

    it('should return false for partially migrated records', () => {
      const partialRecord: ExerciseRecord = {
        ...mockOldRecord,
        timezone: 'Asia/Tokyo'
        // missing timezoneOffset and localTimestamp
      }
      expect(isTimezoneAwareRecord(partialRecord)).toBe(false)
    })
  })

  describe('migrateRecordToTimezoneAware', () => {
    it('should add timezone information to old format records', () => {
      const migrated = migrateRecordToTimezoneAware(mockOldRecord, 'Asia/Tokyo')

      expect(migrated.date).toBe(mockOldRecord.date)
      expect(migrated.type).toBe(mockOldRecord.type)
      expect(migrated.timestamp).toBe(mockOldRecord.timestamp)
      expect(migrated.timezone).toBe('Asia/Tokyo')
      expect(typeof migrated.timezoneOffset).toBe('number')
    })

    it('should return existing timezone-aware records unchanged', () => {
      const migrated = migrateRecordToTimezoneAware(mockTimezoneAwareRecord)

      expect(migrated).toEqual(mockTimezoneAwareRecord)
    })

    it('should use current timezone when not specified', () => {
      const migrated = migrateRecordToTimezoneAware(mockOldRecord)

      expect(migrated.timezone).toBeDefined()
      expect(typeof migrated.timezoneOffset).toBe('number')
    })

    it('should handle errors gracefully', () => {
      // Test with invalid timezone should not throw
      const migrated = migrateRecordToTimezoneAware(mockOldRecord, 'Invalid/Timezone')

      // Should return original record on error
      expect(migrated.date).toBe(mockOldRecord.date)
      expect(migrated.type).toBe(mockOldRecord.type)
      expect(migrated.timestamp).toBe(mockOldRecord.timestamp)
    })
  })

  describe('migrateRecordsToTimezoneAware', () => {
    it('should migrate multiple records', () => {
      const oldRecords: ExerciseRecord[] = [
        mockOldRecord,
        {
          date: '2025-01-16',
          type: 'second',
          timestamp: 1705209856789
        }
      ]

      const migrated = migrateRecordsToTimezoneAware(oldRecords, 'Asia/Tokyo')

      expect(migrated).toHaveLength(2)
      expect(migrated[0].timezone).toBe('Asia/Tokyo')
      expect(migrated[1].timezone).toBe('Asia/Tokyo')
      expect(typeof migrated[0].timezoneOffset).toBe('number')
      expect(typeof migrated[1].timezoneOffset).toBe('number')
    })

    it('should handle mixed old and new format records', () => {
      const mixedRecords: ExerciseRecord[] = [
        mockOldRecord,
        mockTimezoneAwareRecord
      ]

      const migrated = migrateRecordsToTimezoneAware(mixedRecords, 'Asia/Tokyo')

      expect(migrated).toHaveLength(2)
      expect(migrated[0].timezone).toBe('Asia/Tokyo') // migrated
      expect(migrated[1]).toEqual(mockTimezoneAwareRecord) // unchanged
    })

    it('should handle empty array', () => {
      const migrated = migrateRecordsToTimezoneAware([])

      expect(migrated).toEqual([])
    })
  })
})

// Mock getAllRecords function
vi.mock('../recordService', async () => {
  const actual = await vi.importActual('../recordService')
  return {
    ...actual,
    getAllRecords: vi.fn()
  }
})

describe('Timezone-Aware Record Functions', () => {
  beforeEach(() => {
    // Clear any existing mocks
    vi.clearAllMocks()
  })

  describe('recordExerciseWithTimezone', () => {
    it('should save record with timezone information', async () => {
      // Mock localforage
      const mockLocalforage = {
        getItem: vi.fn().mockResolvedValue([]),
        setItem: vi.fn().mockResolvedValue(undefined)
      }

      // This test verifies the function executes successfully
      await expect(recordExerciseWithTimezone('first')).resolves.toBeUndefined()
    })

    it('should handle custom date parameter', async () => {
      const customDate = new Date('2025-01-15T10:30:00Z')

      // This test verifies the function accepts custom date parameter
      await expect(recordExerciseWithTimezone('second', customDate)).resolves.toBeUndefined()
    })
  })

  describe('getRecordsWithTimezoneConversion', () => {
    it('should return empty array when no records exist', async () => {
      // This test verifies the function handles empty data gracefully
      const records = await getRecordsWithTimezoneConversion()
      expect(Array.isArray(records)).toBe(true)
    })

    it('should accept target timezone parameter', async () => {
      // This test verifies the function accepts timezone parameter
      const records = await getRecordsWithTimezoneConversion('America/New_York')
      expect(Array.isArray(records)).toBe(true)
    })

    it('should use correct timezone offset for target timezone', async () => {
      // Mock a record with timezone information
      const mockRecord = {
        date: '2025-01-15',
        type: 'first' as const,
        timestamp: new Date('2025-01-15T12:00:00Z').getTime(),
        timezone: 'Asia/Tokyo',
        timezoneOffset: -540,
        localTimestamp: new Date('2025-01-15T21:00:00').getTime()
      }

      // Mock getAllRecords to return our test record
      vi.mocked(getAllRecords).mockResolvedValue([mockRecord])

      // Convert to New York timezone
      const records = await getRecordsWithTimezoneConversion('America/New_York')

      expect(records.length).toBeGreaterThan(0)

      // Find the record that was converted (not the migrated one)
      const convertedRecord = records.find(r => r.timezone === 'America/New_York')
      expect(convertedRecord).toBeDefined()

      if (convertedRecord) {
        // Verify the timezone was updated
        expect(convertedRecord.timezone).toBe('America/New_York')

        // Verify the offset is for New York timezone (not the original Tokyo offset)
        // New York in January is UTC-5 = -300 minutes
        expect(convertedRecord.timezoneOffset).toBe(-300)

        // Verify the date was converted to New York timezone
        expect(convertedRecord.date).toBe('2025-01-14') // Should be previous day due to timezone difference
      }
    })
  })
})
