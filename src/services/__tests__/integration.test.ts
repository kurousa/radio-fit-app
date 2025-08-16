/**
 * タイムゾーンサービス統合テスト
 */

import { describe, it, expect } from 'vitest'
import { TimezoneService } from '../timezoneService'
import { DateUtils } from '../dateUtils'
import type { ExerciseRecord } from '../recordService'

describe('Timezone Services Integration', () => {
  it('should work together for timezone-aware operations', () => {
    // 現在のタイムゾーン情報を取得
    const timezoneInfo = TimezoneService.getCurrentTimezoneInfo()
    expect(timezoneInfo.timezone).toBeTruthy()

    // UTC タイムスタンプをローカル時刻に変換
    const utcTimestamp = new Date('2025-01-15T12:00:00Z').getTime()
    const localDate = TimezoneService.convertUTCToLocal(utcTimestamp, timezoneInfo.timezone)
    expect(localDate).toBeInstanceOf(Date)

    // ローカル日付文字列を生成
    const localDateString = TimezoneService.formatLocalDate(localDate, timezoneInfo.timezone)
    expect(localDateString).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // 2つの日付が同じローカル日付かチェック
    const anotherDate = new Date(utcTimestamp + 1000 * 60 * 60) // 1時間後
    const isSameDay = DateUtils.isSameLocalDate(localDate, anotherDate, timezoneInfo.timezone)
    expect(typeof isSameDay).toBe('boolean')
  })

  it('should handle exercise records with timezone conversion', () => {
    const timezoneInfo = TimezoneService.getCurrentTimezoneInfo()

    // サンプル記録データ
    const records: ExerciseRecord[] = [
      {
        date: '2025-01-15',
        type: 'first',
        timestamp: new Date('2025-01-15T10:00:00Z').getTime()
      },
      {
        date: '2025-01-14',
        type: 'first',
        timestamp: new Date('2025-01-14T10:00:00Z').getTime()
      }
    ]

    // カレンダー表示用に変換
    const calendarData = DateUtils.convertRecordsForCalendar(records, timezoneInfo.timezone)
    expect(Array.isArray(calendarData)).toBe(true)
    expect(calendarData.length).toBeGreaterThan(0)

    // 連続日数を計算
    const streak = DateUtils.calculateStreakWithTimezone(records)
    expect(typeof streak).toBe('number')
    expect(streak).toBeGreaterThanOrEqual(0)
  })

  it('should handle timezone conversion edge cases', () => {
    // 日付境界での変換テスト
    const midnightUTC = new Date('2025-01-15T00:00:00Z').getTime()
    const localMidnight = TimezoneService.convertUTCToLocal(midnightUTC, 'Asia/Tokyo')

    expect(localMidnight).toBeInstanceOf(Date)

    // 日付文字列フォーマット
    const formattedDate = TimezoneService.formatLocalDate(localMidnight, 'Asia/Tokyo')
    expect(formattedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // 今日かどうかの判定
    const isToday = DateUtils.isToday(new Date(), 'Asia/Tokyo')
    expect(typeof isToday).toBe('boolean')
  })

  it('should maintain consistency across different operations', () => {
    const timezone = 'Europe/London'
    const testDate = new Date('2025-06-15T14:30:00Z') // サマータイム期間

    // UTC → ローカル → UTC の往復変換
    const localDate = TimezoneService.convertUTCToLocal(testDate.getTime(), timezone)
    const backToUTC = TimezoneService.convertLocalToUTC(localDate, timezone)

    // 多少の誤差は許容（ミリ秒レベル）
    const timeDiff = Math.abs(backToUTC - testDate.getTime())
    expect(timeDiff).toBeLessThan(1000) // 1秒以内の誤差

    // 日付文字列の一貫性
    const dateString1 = TimezoneService.formatLocalDate(testDate, timezone)
    const dateString2 = TimezoneService.formatLocalDate(localDate, timezone)
    expect(dateString1).toBe(dateString2)
  })
})
