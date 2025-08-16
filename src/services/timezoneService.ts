/**
 * タイムゾーン処理サービス
 * ブラウザのIntl APIを使用してタイムゾーン検出・変換機能を提供
 */

export interface TimezoneInfo {
  timezone: string // IANA タイムゾーン識別子 (例: "Asia/Tokyo")
  offset: number // タイムゾーンオフセット (分単位)
  localTime: Date // ローカル時刻
  utcTime: Date // UTC時刻
}

export interface TimezoneError {
  type: 'detection_failed' | 'invalid_timezone' | 'conversion_error'
  message: string
  fallbackAction: string
}

export class TimezoneErrorHandler {
  /**
   * タイムゾーンエラーを処理する
   */
  static handleError(error: TimezoneError): void {
    console.error(`Timezone Error [${error.type}]:`, error.message)
    console.info('Fallback action:', error.fallbackAction)

    // ユーザーへの通知（実装は後のタスクで行う）
    this.showUserNotification(`タイムゾーン処理でエラーが発生しました: ${error.message}`)
  }

  /**
   * ユーザーへの通知を表示する
   */
  static showUserNotification(message: string): void {
    // 現在はコンソールログのみ、後でUI通知を実装
    console.warn('User Notification:', message)
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
        utcTime: new Date(now.getTime() - (offset * 60 * 1000))
      }
    } catch (error) {
      const fallbackError: TimezoneError = {
        type: 'detection_failed',
        message: 'ユーザーのタイムゾーン検出に失敗しました',
        fallbackAction: `${this.FALLBACK_TIMEZONE}を使用します`
      }
      TimezoneErrorHandler.handleError(fallbackError)

      const now = new Date()
      return {
        timezone: this.FALLBACK_TIMEZONE,
        offset: 0,
        localTime: now,
        utcTime: now
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
        throw new Error(`Invalid timezone: ${timezone}`)
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
      const conversionError: TimezoneError = {
        type: 'conversion_error',
        message: `UTC→ローカル時刻変換に失敗: ${error}`,
        fallbackAction: 'UTC時刻をそのまま返します'
      }
      TimezoneErrorHandler.handleError(conversionError)
      return new Date(utcTimestamp)
    }
  }

  /**
   * ローカル時刻をUTCに変換
   */
  static convertLocalToUTC(localDate: Date, timezone: string): number {
    try {
      if (!this.isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`)
      }

      // ローカル時刻をUTCに変換
      const year = localDate.getFullYear()
      const month = localDate.getMonth()
      const day = localDate.getDate()
      const hour = localDate.getHours()
      const minute = localDate.getMinutes()
      const second = localDate.getSeconds()

      // 指定されたタイムゾーンでの時刻を作成
      const localTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`

      // タイムゾーンオフセットを計算してUTCに変換
      const offset = this.getTimezoneOffset(localDate, timezone)
      const utcTimestamp = localDate.getTime() - (offset * 60 * 1000)

      return utcTimestamp
    } catch (error) {
      const conversionError: TimezoneError = {
        type: 'conversion_error',
        message: `ローカル→UTC時刻変換に失敗: ${error}`,
        fallbackAction: 'ローカル時刻をそのまま返します'
      }
      TimezoneErrorHandler.handleError(conversionError)
      return localDate.getTime()
    }
  }

  /**
   * 日付文字列をタイムゾーン考慮で生成
   */
  static formatLocalDate(date: Date, timezone: string): string {
    try {
      if (!this.isValidTimezone(timezone)) {
        throw new Error(`Invalid timezone: ${timezone}`)
      }

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })

      return formatter.format(date)
    } catch (error) {
      const conversionError: TimezoneError = {
        type: 'conversion_error',
        message: `日付フォーマットに失敗: ${error}`,
        fallbackAction: 'ISO日付文字列を返します'
      }
      TimezoneErrorHandler.handleError(conversionError)
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
      // UTCでの時刻
      const utcTime = date.getTime()

      // 指定タイムゾーンでの時刻を取得
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

      const parts = formatter.formatToParts(date)
      const partsObj = parts.reduce((acc, part) => {
        acc[part.type] = part.value
        return acc
      }, {} as Record<string, string>)

      const localTime = new Date(
        parseInt(partsObj.year),
        parseInt(partsObj.month) - 1,
        parseInt(partsObj.day),
        parseInt(partsObj.hour),
        parseInt(partsObj.minute),
        parseInt(partsObj.second)
      ).getTime()

      // オフセットを分単位で計算
      return Math.round((localTime - utcTime) / (1000 * 60))
    } catch (error) {
      console.error('Failed to get timezone offset:', error)
      return 0
    }
  }
}
