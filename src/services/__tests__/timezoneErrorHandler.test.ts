/**
 * TimezoneErrorHandler のテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { TimezoneErrorHandler } from '../timezoneService'
import type { TimezoneError } from '../types'

describe('TimezoneErrorHandler', () => {
  // コンソールメソッドをモック
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
  const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  beforeEach(() => {
    // 各テスト前にエラーログとコールバックをクリア
    TimezoneErrorHandler.clearErrorLog()
    TimezoneErrorHandler.clearNotificationCallbacks()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // テスト後のクリーンアップ
    TimezoneErrorHandler.clearErrorLog()
    TimezoneErrorHandler.clearNotificationCallbacks()
  })

  describe('handleError', () => {
    it('エラーを適切にログに記録する', () => {
      const error: TimezoneError = {
        type: 'detection_failed',
        message: 'テストエラー',
        fallbackAction: 'フォールバック処理'
      }

      TimezoneErrorHandler.handleError(error)

      const errorLog = TimezoneErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0].type).toBe('detection_failed')
      expect(errorLog[0].message).toBe('テストエラー')
      expect(errorLog[0].fallbackAction).toBe('フォールバック処理')
      expect(errorLog[0].timestamp).toBeDefined()
    })

    it('コンソールにエラー情報を出力する', () => {
      const error: TimezoneError = {
        type: 'conversion_error',
        message: 'テスト変換エラー',
        fallbackAction: 'フォールバック処理'
      }

      TimezoneErrorHandler.handleError(error)

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Timezone Error [conversion_error]:',
        'テスト変換エラー'
      )
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        'Fallback action:',
        'フォールバック処理'
      )
    })

    it('登録されたコールバック関数を呼び出す', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      const error: TimezoneError = {
        type: 'invalid_timezone',
        message: 'テスト無効タイムゾーン',
        fallbackAction: 'フォールバック処理'
      }

      TimezoneErrorHandler.handleError(error)

      expect(mockCallback).toHaveBeenCalledWith(
        'タイムゾーン設定に問題があります。標準時刻で表示されます。',
        'warning'
      )
    })
  })

  describe('showUserNotification', () => {
    it('登録されたコールバック関数を呼び出す', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      TimezoneErrorHandler.showUserNotification('テストメッセージ', 'info')

      expect(mockCallback).toHaveBeenCalledWith('テストメッセージ', 'info')
    })

    it('デフォルトでerrorタイプを使用する', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      TimezoneErrorHandler.showUserNotification('テストメッセージ')

      expect(mockCallback).toHaveBeenCalledWith('テストメッセージ', 'error')
    })

    it('コールバックエラーを適切に処理する', () => {
      const mockCallback = vi.fn().mockImplementation(() => {
        throw new Error('コールバックエラー')
      })
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      // エラーが投げられないことを確認
      expect(() => {
        TimezoneErrorHandler.showUserNotification('テストメッセージ')
      }).not.toThrow()

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Notification callback error:',
        expect.any(Error)
      )
    })

    it('フォールバックとしてコンソールログを出力する', () => {
      TimezoneErrorHandler.showUserNotification('テストメッセージ', 'warning')

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'User Notification:',
        'テストメッセージ'
      )
    })
  })

  describe('コールバック管理', () => {
    it('コールバック関数を正しく登録・削除する', () => {
      const mockCallback1 = vi.fn()
      const mockCallback2 = vi.fn()

      TimezoneErrorHandler.registerNotificationCallback(mockCallback1)
      TimezoneErrorHandler.registerNotificationCallback(mockCallback2)

      TimezoneErrorHandler.showUserNotification('テスト')

      expect(mockCallback1).toHaveBeenCalled()
      expect(mockCallback2).toHaveBeenCalled()

      // 1つのコールバックを削除
      TimezoneErrorHandler.unregisterNotificationCallback(mockCallback1)
      vi.clearAllMocks()

      TimezoneErrorHandler.showUserNotification('テスト2')

      expect(mockCallback1).not.toHaveBeenCalled()
      expect(mockCallback2).toHaveBeenCalled()
    })

    it('すべてのコールバックをクリアする', () => {
      const mockCallback1 = vi.fn()
      const mockCallback2 = vi.fn()

      TimezoneErrorHandler.registerNotificationCallback(mockCallback1)
      TimezoneErrorHandler.registerNotificationCallback(mockCallback2)

      TimezoneErrorHandler.clearNotificationCallbacks()

      TimezoneErrorHandler.showUserNotification('テスト')

      expect(mockCallback1).not.toHaveBeenCalled()
      expect(mockCallback2).not.toHaveBeenCalled()
    })
  })

  describe('エラーログ管理', () => {
    it('エラーログを正しく管理する', () => {
      const error1: TimezoneError = {
        type: 'detection_failed',
        message: 'エラー1',
        fallbackAction: 'フォールバック1'
      }

      const error2: TimezoneError = {
        type: 'conversion_error',
        message: 'エラー2',
        fallbackAction: 'フォールバック2'
      }

      TimezoneErrorHandler.handleError(error1)
      TimezoneErrorHandler.handleError(error2)

      const errorLog = TimezoneErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(2)
      expect(errorLog[0].message).toBe('エラー1')
      expect(errorLog[1].message).toBe('エラー2')
    })

    it('エラーログの最大サイズを制限する', () => {
      // 51個のエラーを生成（MAX_ERROR_LOG_SIZE = 50を超える）
      for (let i = 0; i < 51; i++) {
        const error: TimezoneError = {
          type: 'detection_failed',
          message: `エラー${i}`,
          fallbackAction: 'フォールバック'
        }
        TimezoneErrorHandler.handleError(error)
      }

      const errorLog = TimezoneErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(50) // 最大50個まで
      expect(errorLog[0].message).toBe('エラー1') // 最初のエラーが削除されている
      expect(errorLog[49].message).toBe('エラー50')
    })

    it('エラーカウントを正しく取得する', () => {
      const error1: TimezoneError = {
        type: 'detection_failed',
        message: 'エラー1',
        fallbackAction: 'フォールバック1'
      }

      const error2: TimezoneError = {
        type: 'conversion_error',
        message: 'エラー2',
        fallbackAction: 'フォールバック2'
      }

      const error3: TimezoneError = {
        type: 'detection_failed',
        message: 'エラー3',
        fallbackAction: 'フォールバック3'
      }

      TimezoneErrorHandler.handleError(error1)
      TimezoneErrorHandler.handleError(error2)
      TimezoneErrorHandler.handleError(error3)

      expect(TimezoneErrorHandler.getErrorCount()).toBe(3)
      expect(TimezoneErrorHandler.getErrorCount('detection_failed')).toBe(2)
      expect(TimezoneErrorHandler.getErrorCount('conversion_error')).toBe(1)
      expect(TimezoneErrorHandler.getErrorCount('invalid_timezone')).toBe(0)
    })

    it('エラーログをクリアする', () => {
      const error: TimezoneError = {
        type: 'detection_failed',
        message: 'テストエラー',
        fallbackAction: 'フォールバック'
      }

      TimezoneErrorHandler.handleError(error)
      expect(TimezoneErrorHandler.getErrorLog()).toHaveLength(1)

      TimezoneErrorHandler.clearErrorLog()
      expect(TimezoneErrorHandler.getErrorLog()).toHaveLength(0)
    })
  })

  describe('専用ハンドラー', () => {
    it('handleDetectionFailure が適切なフォールバック値を返す', () => {
      const originalError = new Error('検出失敗')
      const result = TimezoneErrorHandler.handleDetectionFailure(originalError)

      expect(result.timezone).toBe('UTC')
      expect(result.offset).toBe(0)
      expect(result.localTime).toBeInstanceOf(Date)
      expect(result.utcTime).toBeInstanceOf(Date)

      const errorLog = TimezoneErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0].type).toBe('detection_failed')
      expect(errorLog[0].message).toContain('検出失敗')
    })

    it('handleInvalidTimezone が適切にエラーを記録する', () => {
      TimezoneErrorHandler.handleInvalidTimezone('Invalid/Timezone', 'テスト操作')

      const errorLog = TimezoneErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0].type).toBe('invalid_timezone')
      expect(errorLog[0].message).toContain('Invalid/Timezone')
      expect(errorLog[0].message).toContain('テスト操作')
    })

    it('handleConversionError が適切にエラーを記録する', () => {
      const originalError = new Error('変換失敗')
      TimezoneErrorHandler.handleConversionError('テスト変換', originalError)

      const errorLog = TimezoneErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0].type).toBe('conversion_error')
      expect(errorLog[0].message).toContain('テスト変換')
      expect(errorLog[0].message).toContain('変換失敗')
    })
  })

  describe('メッセージフォーマット', () => {
    it('detection_failed エラーのユーザーメッセージを正しくフォーマットする', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      const error: TimezoneError = {
        type: 'detection_failed',
        message: 'テストメッセージ',
        fallbackAction: 'フォールバック'
      }

      TimezoneErrorHandler.handleError(error)

      expect(mockCallback).toHaveBeenCalledWith(
        'タイムゾーンの自動検出ができませんでした。UTC時刻で表示されます。',
        'warning'
      )
    })

    it('invalid_timezone エラーのユーザーメッセージを正しくフォーマットする', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      const error: TimezoneError = {
        type: 'invalid_timezone',
        message: 'テストメッセージ',
        fallbackAction: 'フォールバック'
      }

      TimezoneErrorHandler.handleError(error)

      expect(mockCallback).toHaveBeenCalledWith(
        'タイムゾーン設定に問題があります。標準時刻で表示されます。',
        'warning'
      )
    })

    it('conversion_error エラーのユーザーメッセージを正しくフォーマットする', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      const error: TimezoneError = {
        type: 'conversion_error',
        message: 'テストメッセージ',
        fallbackAction: 'フォールバック'
      }

      TimezoneErrorHandler.handleError(error)

      expect(mockCallback).toHaveBeenCalledWith(
        '時刻の変換処理でエラーが発生しました。表示が正しくない可能性があります。',
        'error'
      )
    })
  })

  describe('通知レベル判定', () => {
    it('エラータイプに応じて適切な通知レベルを設定する', () => {
      const mockCallback = vi.fn()
      TimezoneErrorHandler.registerNotificationCallback(mockCallback)

      // detection_failed -> warning
      TimezoneErrorHandler.handleError({
        type: 'detection_failed',
        message: 'テスト',
        fallbackAction: 'フォールバック'
      })

      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.any(String),
        'warning'
      )

      // invalid_timezone -> warning
      TimezoneErrorHandler.handleError({
        type: 'invalid_timezone',
        message: 'テスト',
        fallbackAction: 'フォールバック'
      })

      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.any(String),
        'warning'
      )

      // conversion_error -> error
      TimezoneErrorHandler.handleError({
        type: 'conversion_error',
        message: 'テスト',
        fallbackAction: 'フォールバック'
      })

      expect(mockCallback).toHaveBeenLastCalledWith(
        expect.any(String),
        'error'
      )
    })
  })
})
