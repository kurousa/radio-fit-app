/**
 * 日付処理ユーティリティクラス
 * タイムゾーンを考慮した日付比較・計算機能を提供
 */

import { TimezoneService } from './timezoneService'
import type { ExerciseRecord } from './recordService'
import type { CalendarDate } from './types'

export class DateUtils {
  /**
   * タイムゾーンを考慮した日付比較
   * 2つの日付が同じローカル日付かどうかを判定
   */
  static isSameLocalDate(date1: Date, date2: Date, timezone: string): boolean {
    try {
      const localDate1 = TimezoneService.formatLocalDate(date1, timezone)
      const localDate2 = TimezoneService.formatLocalDate(date2, timezone)
      return localDate1 === localDate2
    } catch (error) {
      console.error('Failed to compare local dates:', error)
      // フォールバック: UTC日付で比較
      const utcDate1 = date1.toISOString().split('T')[0]
      const utcDate2 = date2.toISOString().split('T')[0]
      return utcDate1 === utcDate2
    }
  }

  /**
   * 連続日数計算（タイムゾーン対応）
   * 記録を基に現在の連続実施日数を計算
   */
  static calculateStreakWithTimezone(records: ExerciseRecord[]): number {
    if (records.length === 0) return 0

    try {
      const currentTimezone = TimezoneService.getCurrentTimezoneInfo().timezone
      const today = new Date()
      const todayLocalDate = TimezoneService.formatLocalDate(today, currentTimezone)

      // 記録を日付でグループ化（タイムゾーン考慮）
      const recordsByDate = this.groupRecordsByLocalDate(records, currentTimezone)

      // 日付を降順でソート
      const sortedDates = Object.keys(recordsByDate).sort().reverse()

      let streak = 0
      let checkDate = todayLocalDate

      // 今日から遡って連続日数をカウント
      for (const dateStr of sortedDates) {
        if (dateStr === checkDate) {
          streak++
          // 前日の日付を計算
          const currentDate = new Date(checkDate + 'T00:00:00')
          const previousDay = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
          checkDate = TimezoneService.formatLocalDate(previousDay, currentTimezone)
        } else if (dateStr < checkDate) {
          // 日付が飛んでいる場合は連続終了
          break
        }
      }

      return streak
    } catch (error) {
      console.error('Failed to calculate streak with timezone:', error)
      // フォールバック: 単純な日付文字列比較
      return this.calculateSimpleStreak(records)
    }
  }

  /**
   * カレンダー表示用の日付変換
   * 記録をカレンダー表示用の形式に変換
   */
  static convertRecordsForCalendar(
    records: ExerciseRecord[],
    displayTimezone: string
  ): CalendarDate[] {
    try {
      const recordsByDate = this.groupRecordsByLocalDate(records, displayTimezone)

      return Object.entries(recordsByDate).map(([dateStr, dayRecords]) => {
        // ローカル日付文字列から Date オブジェクトを作成
        const date = new Date(dateStr + 'T12:00:00') // 正午を指定して日付境界問題を回避

        return {
          date,
          records: dayRecords,
          localDateString: dateStr
        }
      })
    } catch (error) {
      console.error('Failed to convert records for calendar:', error)
      // フォールバック: 既存の date フィールドを使用
      return this.convertRecordsSimple(records)
    }
  }

  /**
   * 記録をローカル日付でグループ化
   */
  private static groupRecordsByLocalDate(
    records: ExerciseRecord[],
    timezone: string
  ): Record<string, ExerciseRecord[]> {
    const grouped: Record<string, ExerciseRecord[]> = {}

    for (const record of records) {
      let localDateStr: string

      if (record.timezone && record.localTimestamp) {
        // 新しい形式の記録（タイムゾーン情報あり）
        const localDate = new Date(record.localTimestamp)
        localDateStr = TimezoneService.formatLocalDate(localDate, timezone)
      } else if (record.timestamp) {
        // 既存の形式の記録（UTC タイムスタンプのみ）
        const utcDate = new Date(record.timestamp)
        localDateStr = TimezoneService.formatLocalDate(utcDate, timezone)
      } else {
        // フォールバック: date フィールドを使用
        localDateStr = record.date
      }

      if (!grouped[localDateStr]) {
        grouped[localDateStr] = []
      }
      grouped[localDateStr].push(record)
    }

    return grouped
  }

  /**
   * 単純な連続日数計算（フォールバック用）
   */
  private static calculateSimpleStreak(records: ExerciseRecord[]): number {
    if (records.length === 0) return 0

    const today = new Date().toISOString().split('T')[0]
    const uniqueDates = [...new Set(records.map(r => r.date))].sort().reverse()

    let streak = 0
    let expectedDate = today

    for (const date of uniqueDates) {
      if (date === expectedDate) {
        streak++
        const currentDate = new Date(expectedDate)
        const previousDay = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000)
        expectedDate = previousDay.toISOString().split('T')[0]
      } else if (date < expectedDate) {
        break
      }
    }

    return streak
  }

  /**
   * 単純なカレンダー変換（フォールバック用）
   */
  private static convertRecordsSimple(records: ExerciseRecord[]): CalendarDate[] {
    const recordsByDate: Record<string, ExerciseRecord[]> = {}

    for (const record of records) {
      const dateStr = record.date
      if (!recordsByDate[dateStr]) {
        recordsByDate[dateStr] = []
      }
      recordsByDate[dateStr].push(record)
    }

    return Object.entries(recordsByDate).map(([dateStr, dayRecords]) => ({
      date: new Date(dateStr + 'T12:00:00'),
      records: dayRecords,
      localDateString: dateStr
    }))
  }

  /**
   * 日付が今日かどうかを判定（タイムゾーン考慮）
   */
  static isToday(date: Date, timezone?: string): boolean {
    try {
      const targetTimezone = timezone || TimezoneService.getCurrentTimezoneInfo().timezone
      const today = new Date()
      return this.isSameLocalDate(date, today, targetTimezone)
    } catch (error) {
      console.error('Failed to check if date is today:', error)
      // フォールバック: UTC日付で比較
      const todayUTC = new Date().toISOString().split('T')[0]
      const dateUTC = date.toISOString().split('T')[0]
      return todayUTC === dateUTC
    }
  }

  /**
   * 2つの日付の間の日数を計算（タイムゾーン考慮）
   */
  static daysBetween(date1: Date, date2: Date, timezone?: string): number {
    try {
      const targetTimezone = timezone || TimezoneService.getCurrentTimezoneInfo().timezone

      const localDate1 = TimezoneService.formatLocalDate(date1, targetTimezone)
      const localDate2 = TimezoneService.formatLocalDate(date2, targetTimezone)

      const d1 = new Date(localDate1 + 'T00:00:00')
      const d2 = new Date(localDate2 + 'T00:00:00')

      const diffTime = Math.abs(d2.getTime() - d1.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch (error) {
      console.error('Failed to calculate days between dates:', error)
      // フォールバック: 単純な計算
      const diffTime = Math.abs(date2.getTime() - date1.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }
  }

  /**
   * 指定された日付の週の開始日を取得（タイムゾーン考慮）
   */
  static getWeekStart(date: Date, timezone?: string): Date {
    try {
      const targetTimezone = timezone || TimezoneService.getCurrentTimezoneInfo().timezone
      const localDateStr = TimezoneService.formatLocalDate(date, targetTimezone)
      const localDate = new Date(localDateStr + 'T00:00:00')

      const dayOfWeek = localDate.getDay()
      const diff = localDate.getDate() - dayOfWeek

      return new Date(localDate.setDate(diff))
    } catch (error) {
      console.error('Failed to get week start:', error)
      // フォールバック
      const dayOfWeek = date.getDay()
      const diff = date.getDate() - dayOfWeek
      return new Date(date.getFullYear(), date.getMonth(), diff)
    }
  }
}
