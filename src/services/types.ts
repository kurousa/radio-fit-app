/**
 * 共通型定義
 * タイムゾーン対応機能で使用される型定義を集約
 */

import type { ExerciseRecord } from './recordService'

/**
 * タイムゾーン情報
 */
export interface TimezoneInfo {
  timezone: string // IANA タイムゾーン識別子 (例: "Asia/Tokyo")
  offset: number // タイムゾーンオフセット (分単位)
  localTime: Date // ローカル時刻
  utcTime: Date // UTC時刻
}

/**
 * カレンダー表示用の日付データ
 */
export interface CalendarDate {
  date: Date // 表示用の日付オブジェクト
  records: ExerciseRecord[] // その日の記録一覧
  localDateString: string // ローカル日付文字列 (YYYY-MM-DD)
}

/**
 * タイムゾーンエラー情報
 */
export interface TimezoneError {
  type: 'detection_failed' | 'invalid_timezone' | 'conversion_error'
  message: string
  fallbackAction: string
  timestamp?: string // エラー発生時刻（ISO文字列）
}

/**
 * タイムゾーン処理のフォールバックアクションメッセージ
 */
export const TIMEZONE_FALLBACK_ACTIONS = {
  USE_UTC: 'UTCタイムゾーンを使用して処理を続行します',
  KEEP_ORIGINAL: '元の値をそのまま使用します',
} as const

/**
 * タイムゾーンエラーのユーザー向けメッセージ
 */
export const TIMEZONE_USER_MESSAGES = {
  DETECTION_FAILED: 'タイムゾーンの自動検出ができませんでした。UTC時刻で表示されます。',
  INVALID_TIMEZONE: 'タイムゾーン設定に問題があります。標準時刻で表示されます。',
  CONVERSION_ERROR: '時刻の変換処理でエラーが発生しました。表示が正しくない可能性があります。',
} as const

/**
 * 記録統計情報
 */
export interface RecordStats {
  totalRecords: number // 総記録数
  currentStreak: number // 現在の連続日数
  longestStreak: number // 最長連続日数
  firstRecordDate?: string // 最初の記録日
  lastRecordDate?: string // 最後の記録日
}

/**
 * カレンダー属性（V-Calendar用）
 */
export interface CalendarAttribute {
  key: string // 一意のキー
  dates: Date | Date[] // 対象日付
  highlight?: {
    color: string
    fillMode: 'solid' | 'light' | 'outline'
  }
  popover?: {
    label: string
    visibility?: 'hover' | 'focus' | 'visible' | 'hidden'
  }
}

/**
 * 記録フィルター条件
 */
export interface RecordFilter {
  startDate?: string // 開始日 (YYYY-MM-DD)
  endDate?: string // 終了日 (YYYY-MM-DD)
  type?: 'first' | 'second' | 'both' // 体操の種類
  timezone?: string // 表示タイムゾーン
}
