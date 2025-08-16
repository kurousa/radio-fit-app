/**
 * タイムゾーン変更検出サービス
 * ブラウザのタイムゾーン変更を検出し、自動更新機能を提供
 */

import { TimezoneService } from './timezoneService'

export type TimezoneChangeCallback = (newTimezone: string, oldTimezone: string) => void

export class TimezoneChangeDetector {
  private static instance: TimezoneChangeDetector | null = null
  private currentTimezone: string
  private callbacks: Set<TimezoneChangeCallback> = new Set()
  private checkInterval: number | null = null
  private readonly CHECK_INTERVAL_MS = 30000 // 30秒ごとにチェック

  private constructor() {
    this.currentTimezone = this.getCurrentTimezone()
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): TimezoneChangeDetector {
    if (!this.instance) {
      this.instance = new TimezoneChangeDetector()
    }
    return this.instance
  }

  /**
   * タイムゾーン変更の監視を開始
   */
  startMonitoring(): void {
    if (this.checkInterval !== null) {
      console.warn('Timezone monitoring is already running')
      return
    }

    console.log('Starting timezone change monitoring...')
    this.checkInterval = window.setInterval(() => {
      this.checkTimezoneChange()
    }, this.CHECK_INTERVAL_MS)

    // ページの可視性変更時にもチェック（タブ切り替え時など）
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  /**
   * タイムゾーン変更の監視を停止
   */
  stopMonitoring(): void {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('Timezone monitoring stopped')
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
  }

  /**
   * タイムゾーン変更時のコールバックを登録
   */
  onTimezoneChange(callback: TimezoneChangeCallback): () => void {
    this.callbacks.add(callback)

    // アンサブスクライブ関数を返す
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * 現在のタイムゾーンを取得
   */
  getCurrentTimezone(): string {
    try {
      return TimezoneService.getCurrentTimezoneInfo().timezone
    } catch (error) {
      console.error('Failed to get current timezone:', error)
      return 'UTC'
    }
  }

  /**
   * タイムゾーン変更をチェック
   */
  private checkTimezoneChange(): void {
    try {
      const detectedTimezone = this.getCurrentTimezone()

      if (this.currentTimezone !== detectedTimezone) {
        console.log(`Timezone change detected: ${this.currentTimezone} → ${detectedTimezone}`)

        const oldTimezone = this.currentTimezone
        this.currentTimezone = detectedTimezone

        // 全てのコールバックを実行
        this.callbacks.forEach(callback => {
          try {
            callback(detectedTimezone, oldTimezone)
          } catch (error) {
            console.error('Error in timezone change callback:', error)
          }
        })
      }
    } catch (error) {
      console.error('Error checking timezone change:', error)
    }
  }

  /**
   * ページの可視性変更時の処理
   */
  private handleVisibilityChange(): void {
    if (!document.hidden) {
      // ページが再び表示された時にタイムゾーンをチェック
      this.checkTimezoneChange()
    }
  }

  /**
   * 手動でタイムゾーンチェックを実行
   */
  forceCheck(): void {
    this.checkTimezoneChange()
  }

  /**
   * 現在監視中かどうかを確認
   */
  isMonitoring(): boolean {
    return this.checkInterval !== null
  }

  /**
   * 登録されているコールバック数を取得（デバッグ用）
   */
  getCallbackCount(): number {
    return this.callbacks.size
  }
}

/**
 * グローバルなタイムゾーン変更検出インスタンス
 */
export const timezoneChangeDetector = TimezoneChangeDetector.getInstance()
