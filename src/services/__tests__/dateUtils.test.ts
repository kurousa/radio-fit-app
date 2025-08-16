/**
 * DateUtils のテスト
 */

import { describe, it, expect } from 'vitest'
import { DateUtils, type ExerciseRecord } from '../dateUtils'

describe('DateUtils', () => {
  describe('isSameLocalDate', () => {
    it('should return true for same local dates', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2025-01-15T14:00:00Z')

      const result = DateUtils.isSameLocalDate(date1, date2, 'UTC')
      expect(result).toBe(true)
    })

    it('should return false for different local dates', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2025-01-16T10:00:00Z')

      const result = DateUtils.isSameLocalDate(date1, date2, 'UTC')
      expect(result).toBe(false)
    })

    it('should fallback to UTC comparison on error', () => {
      const date1 = new Date('2025-01-15T10:00:00Z')
      const date2 = new Date('2025-01-15T14:00:00Z')

      const result = DateUtils.isSameLocalDate(date1, date2, 'Invalid/Timezone')
      expect(result).toBe(true)
    })
  })

  describe('calculateStreakWithTimezone', () => {
    it('should return 0 for empty records', () => {
      const result = DateUtils.calculateStreakWithTimezone([])
      expect(result).toBe(0)
    })

    it('should calculate streak correctly', () => {
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

      const records: ExerciseRecord[] = [
        {
          date: today.toISOString().split('T')[0],
          type: 'first',
          timestamp: today.getTime()
        },
        {
          date: yesterday.toISOString().split('T')[0],
          type: 'first',
          timestamp: yesterday.getTime()
        }
      ]

      const result = DateUtils.calculateStreakWithTimezone(records)
      expect(result).toBeGreaterThanOrEqual(1)
    })

    it('should fallback to simple calculation on error', () => {
      const records: ExerciseRecord[] = [
        {
          date: '2025-01-15',
          type: 'first',
          timestamp: Date.now()
        }
      ]

      const result = DateUtils.calculateStreakWithTimezone(records)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('convertRecordsForCalendar', () => {
    it('should convert records to calendar format', () => {
      const records: ExerciseRecord[] = [
        {
          date: '2025-01-15',
          type: 'first',
          timestamp: new Date('2025-01-15T10:00:00Z').getTime()
        },
        {
          date: '2025-01-15',
          type: 'second',
          timestamp: new Date('2025-01-15T11:00:00Z').getTime()
        }
      ]

      const result = DateUtils.convertRecordsForCalendar(records, 'UTC')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toHaveProperty('date')
      expect(result[0]).toHaveProperty('records')
      expect(result[0]).toHaveProperty('localDateString')
      expect(result[0].date).toBeInstanceOf(Date)
      expect(Array.isArray(result[0].records)).toBe(true)
    })

    it('should fallback to simple conversion on error', () => {
      const records: ExerciseRecord[] = [
        {
          date: '2025-01-15',
          type: 'first',
          timestamp: Date.now()
        }
      ]

      const result = DateUtils.convertRecordsForCalendar(records, 'Invalid/Timezone')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
    })
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date()
      const result = DateUtils.isToday(today)
      expect(result).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const result = DateUtils.isToday(yesterday)
      expect(result).toBe(false)
    })
  })

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date('2025-01-15')
      const date2 = new Date('2025-01-17')

      const result = DateUtils.daysBetween(date1, date2)
      expect(result).toBe(2)
    })

    it('should handle same dates', () => {
      const date = new Date('2025-01-15')

      const result = DateUtils.daysBetween(date, date)
      expect(result).toBe(0)
    })
  })

  describe('getWeekStart', () => {
    it('should return start of week', () => {
      const date = new Date('2025-01-15') // 水曜日と仮定
      const weekStart = DateUtils.getWeekStart(date)

      expect(weekStart).toBeInstanceOf(Date)
      expect(weekStart.getDay()).toBe(0) // 日曜日
    })
  })
})
