import { describe, it, expect, beforeEach } from 'vitest'
import {
  migrateRecordToTimezoneAware,
  migrateRecordsToTimezoneAware,
  isTimezoneAwareRecord,
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
    timezoneOffset: -540,
    localTimestamp: 1705155456789
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
      expect(typeof migrated.localTimestamp).toBe('number')
    })

    it('should return existing timezone-aware records unchanged', () => {
      const migrated = migrateRecordToTimezoneAware(mockTimezoneAwareRecord)

      expect(migrated).toEqual(mockTimezoneAwareRecord)
    })

    it('should use current timezone when not specified', () => {
      const migrated = migrateRecordToTimezoneAware(mockOldRecord)

      expect(migrated.timezone).toBeDefined()
      expect(typeof migrated.timezoneOffset).toBe('number')
      expect(typeof migrated.localTimestamp).toBe('number')
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
