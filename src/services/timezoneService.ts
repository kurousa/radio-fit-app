/**
 * タイムゾーン処理サービス
 * ブラウザのIntl APIを使用してタイムゾーン検出・変換機能を提供
 */

import type { TimezoneInfo, TimezoneError } from './types'

/**
 * タイムゾーンエラーハンドリングクラス
 * エラーの処理とユーザー通知を管理
 */
export class TimezoneErrorHandler {
  private static notificationCallbacks: Array<(message: string, type: 'error' | 'warning' | 'info') => void> = []
  private static errorLog: TimezoneError[] = []
  private static readonly MAX_ERROR_LOG_SIZE = 50

  /**
   * タイムゾーンエラーを処理する
   */
  static handleError(error: TimezoneError): void {
    // エラーログに記録
    this.logError(error)

    // コンソールにエラー情報を出力
    console.error(`Timezone Error [${error.type}]:`, error.message)
    console.info('Fallback action:', error.fallbackAction)

    // エラータイプに応じた適切な通知レベルを決定
    const notificationType = this.getNotificationType(error.type)
    const userMessage = this.formatUserMessage(error)

    // ユーザーへの通知を表示
    this.showUserNotification(userMessage, notificationType)
  }

  /**
   * ユーザーへの通知を表示する
   */
  static showUserNotification(message: string, type: 'error' | 'warning' | 'info' = 'error'): void {
    // 登録されたコールバック関数を呼び出し
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(message, type)
      } catch (error) {
        console.error('Notification callback error:', error)
      }
    })

    // フォールバック: コンソールログ
    const logMethod = type === 'error' ? console.error : type === 'warning' ? console.warn : console.info
    logMethod('User Notification:', message)
  }

  /**
   * 通知コールバック関数を登録
   * Vue コンポーネントから通知システムを登録するために使用
   */
  static registerNotificationCallback(callback: (message: string, type: 'error' | 'warning' | 'info') => void): void {
    this.notificationCallbacks.push(callback)
  }

  /**
   * 通知コールバック関数を削除
   */
  static unregisterNotificationCallback(callback: (message: string, type: 'error' | 'warning' | 'info') => void): void {
    const index = this.notificationCallbacks.indexOf(callback)
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1)
    }
  }

  /**
   * すべての通知コールバックをクリア
   */
  static clearNotificationCallbacks(): void {
    this.notificationCallbacks = []
  }

  /**
   * エラーログを取得
   */
  static getErrorLog(): TimezoneError[] {
    return [...this.errorLog]
  }

  /**
   * エラーログをクリア
   */
  static clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * 特定のエラータイプの発生回数を取得
   */
  static getErrorCount(errorType?: TimezoneError['type']): number {
    if (!errorType) {
      return this.errorLog.length
    }
    return this.errorLog.filter(error => error.type === errorType).length
  }

  /**
   * タイムゾーン検出失敗時の専用ハンドラー
   */
  static handleDetectionFailure(originalError?: Error): TimezoneInfo {
    const error: TimezoneError = {
      type: 'detection_failed',
      message: originalError
        ? `タイムゾーン検出に失敗しました: ${originalError.message}`
        : 'ブラウザからタイムゾーン情報を取得できませんでした',
      fallbackAction: 'UTCタイムゾーンを使用して処理を続行します'
    }

    this.handleError(error)

    // フォールバック値を返す
    const now = new Date()
    return {
      timezone: 'UTC',
      offset: 0,
      localTime: now,
      utcTime: now
    }
  }

  /**
   * 無効なタイムゾーン処理の専用ハンドラー
   */
  static handleInvalidTimezone(timezone: string, operation: string): void {
    const error: TimezoneError = {
      type: 'invalid_timezone',
      message: `無効なタイムゾーン "${timezone}" が指定されました (操作: ${operation})`,
      fallbackAction: 'UTCタイムゾーンを使用して処理を続行します'
    }

    this.handleError(error)
  }

  /**
   * 変換エラー処理の専用ハンドラー
   */
  static handleConversionError(operation: string, originalError: Error): void {
    const error: TimezoneError = {
      type: 'conversion_error',
      message: `${operation}中にエラーが発生しました: ${originalError.message}`,
      fallbackAction: '元の値をそのまま使用します'
    }

    this.handleError(error)
  }

  /**
   * エラーをログに記録
   */
  private static logError(error: TimezoneError): void {
    // タイムスタンプを追加
    const errorWithTimestamp = {
      ...error,
      timestamp: new Date().toISOString()
    }

    this.errorLog.push(errorWithTimestamp as TimezoneError)

    // ログサイズ制限
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog.shift() // 古いエラーを削除
    }
  }

  /**
   * エラータイプに応じた通知レベルを決定
   */
  private static getNotificationType(errorType: TimezoneError['type']): 'error' | 'warning' | 'info' {
    switch (errorType) {
      case 'detection_failed':
        return 'warning' // 検出失敗は警告レベル（フォールバックで動作継続）
      case 'invalid_timezone':
        return 'warning' // 無効なタイムゾーンも警告レベル
      case 'conversion_error':
        return 'error' // 変換エラーはエラーレベル
      default:
        return 'error'
    }
  }

  /**
   * ユーザー向けメッセージをフォーマット
   */
  private static formatUserMessage(error: TimezoneError): string {
    switch (error.type) {
      case 'detection_failed':
        return 'タイムゾーンの自動検出ができませんでした。UTC時刻で表示されます。'
      case 'invalid_timezone':
        return 'タイムゾーン設定に問題があります。標準時刻で表示されます。'
      case 'conversion_error':
        return '時刻の変換処理でエラーが発生しました。表示が正しくない可能性があります。'
      default:
        return `タイムゾーン処理でエラーが発生しました: ${error.message}`
    }
  }
}

export class TimezoneService {
  private static readonly FALLBACK_TIMEZONE = 'UTC'

  /**
   * ユーザーの現在タイムゾーン情報を取得
   */
  static getCurrentTimezoneInfo(): TimezoneInfo {
    try {
      const now = new Date()
      const timezone = this.detectUserTimezone()
      const offset = this.getTimezoneOffset(now, timezone)

      return {
        timezone,
        offset,
        localTime: now,
        utcTime: new Date(now.getTime())
      }
    } catch (error) {
      return TimezoneErrorHandler.handleDetectionFailure(error as Error)
    }
  }

  /**
   * 指定されたタイムゾーンの情報を取得
   * @param timezone - 取得したいタイムゾーン（IANA識別子）
   * @param referenceDate - 基準日時（省略時は現在日時）
   * @returns 指定タイムゾーンの情報
   */
  static getTimezoneInfo(timezone: string, referenceDate?: Date): TimezoneInfo {
    try {
      const date = referenceDate || new Date()

      // タイムゾーンが有効かチェック
      if (!this.isValidTimezone(timezone)) {
        TimezoneErrorHandler.handleInvalidTimezone(timezone, 'タイムゾーン情報取得')
        // フォールバック: UTCを返す
        return {
          timezone: 'UTC',
          offset: 0,
          localTime: date,
          utcTime: date
        }
      }

      const offset = this.getTimezoneOffset(date, timezone)
      const localTime = this.convertUTCToLocal(date.getTime(), timezone)
      const utcTime = new Date(date.getTime())

      return {
        timezone,
        offset,
        localTime,
        utcTime
      }
    } catch (error) {
      TimezoneErrorHandler.handleConversionError('タイムゾーン情報取得', error as Error)
      // フォールバック: UTCを返す
      const date = referenceDate || new Date()
      return {
        timezone: 'UTC',
        offset: 0,
        localTime: date,
        utcTime: date
      }
    }
  }

  /**
   * UTCタイムスタンプをローカル時刻に変換
   */
  static convertUTCToLocal(utcTimestamp: number, targetTimezone?: string): Date {
    try {
      const utcDate = new Date(utcTimestamp)
      const timezone = targetTimezone || this.detectUserTimezone()

      // タイムゾーンが有効かチェック
      if (!this.isValidTimezone(timezone)) {
        TimezoneErrorHandler.handleInvalidTimezone(timezone, 'UTC→ローカル時刻変換')
        return new Date(utcTimestamp) // フォールバック: UTC時刻をそのまま返す
      }

      // Intl.DateTimeFormatを使用してタイムゾーン変換
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })

      const parts = formatter.formatToParts(utcDate)
      const partsObj = parts.reduce((acc, part) => {
        acc[part.type] = part.value
        return acc
      }, {} as Record<string, string>)

      return new Date(
        parseInt(partsObj.year),
        parseInt(partsObj.month) - 1,
        parseInt(partsObj.day),
        parseInt(partsObj.hour),
        parseInt(partsObj.minute),
        parseInt(partsObj.second)
      )
    } catch (error) {
      TimezoneErrorHandler.handleConversionError('UTC→ローカル時刻変換', error as Error)
      return new Date(utcTimestamp)
    }
  }

  /**
   * ローカル時刻をUTCに変換
   */
  static convertLocalToUTC(localDate: Date, timezone: string): number {
    try {
      if (!this.isValidTimezone(timezone)) {
        TimezoneErrorHandler.handleInvalidTimezone(timezone, 'ローカル→UTC時刻変換')
        return localDate.getTime() // フォールバック: ローカル時刻をそのまま返す
      }

      // タイムゾーンオフセットを計算してUTCに変換
      const offset = this.getTimezoneOffset(localDate, timezone)
      const utcTimestamp = localDate.getTime() - (offset * 60 * 1000)

      return utcTimestamp
    } catch (error) {
      TimezoneErrorHandler.handleConversionError('ローカル→UTC時刻変換', error as Error)
      return localDate.getTime()
    }
  }

  /**
   * 日付文字列をタイムゾーン考慮で生成
   */
  static formatLocalDate(date: Date, timezone: string): string {
    try {
      if (!this.isValidTimezone(timezone)) {
        TimezoneErrorHandler.handleInvalidTimezone(timezone, '日付フォーマット')
        return date.toISOString().split('T')[0] // フォールバック: ISO日付文字列
      }

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })

      return formatter.format(date)
    } catch (error) {
      TimezoneErrorHandler.handleConversionError('日付フォーマット', error as Error)
      return date.toISOString().split('T')[0]
    }
  }

  /**
   * ユーザーのタイムゾーンを検出
   */
  private static detectUserTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      throw new Error(`Timezone detection failed: ${error}`)
    }
  }

  /**
   * タイムゾーンが有効かチェック
   */
  private static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
      return true
    } catch {
      return false
    }
  }

  /**
   * 指定された日付とタイムゾーンのオフセットを取得（分単位）
   */
  private static getTimezoneOffset(date: Date, timezone: string): number {
    try {
      // 標準的で確実な方法：Intl.DateTimeFormatを使用してオフセットを直接取得
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'longOffset'
      })

      const parts = formatter.formatToParts(date)
      const offsetPart = parts.find(part => part.type === 'timeZoneName')

      if (offsetPart && offsetPart.value) {
        // "+09:00" や "-05:00" の形式をパース
        const match = offsetPart.value.match(/([+-])(\d{2}):(\d{2})/)
        if (match) {
          const sign = match[1] === '+' ? 1 : -1
          const hours = parseInt(match[2])
          const minutes = parseInt(match[3])
          return sign * (hours * 60 + minutes)
        }
      }

      // フォールバック: 従来の方法
      const utcTime = date.getTime()
      const localTimeString = date.toLocaleString('sv-SE', { timeZone: timezone })
      const localTime = new Date(localTimeString).getTime()
      return Math.round((localTime - utcTime) / (1000 * 60))
    } catch (error) {
      console.error('Failed to get timezone offset:', error)
      return 0
    }
  }
}
