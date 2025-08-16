/**
 * useNotifications composable のシンプルなテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useNotifications } from '../useNotifications'
import { TimezoneErrorHandler } from '../../services/timezoneService'

// タイマーをモック
vi.useFakeTimers()

describe('useNotifications', () => {
  beforeEach(() => {
    // 各テスト前にクリーンアップ
    TimezoneErrorHandler.clearNotificationCallbacks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    // テスト後のクリーンアップ
    TimezoneErrorHandler.clearNotificationCallbacks()
    vi.clearAllTimers()
  })

  describe('基本的な通知機能', () => {
    it('通知を追加できる', () => {
      const { notifications, addNotification } = useNotifications()

      const id = addNotification('テストメッセージ', 'info', 5000)

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].id).toBe(id)
      expect(notifications.value[0].message).toBe('テストメッセージ')
      expect(notifications.value[0].type).toBe('info')
      expect(notifications.value[0].duration).toBe(5000)
      expect(notifications.value[0].timestamp).toBeInstanceOf(Date)
    })

    it('通知を削除できる', () => {
      const { notifications, addNotification, removeNotification } = useNotifications()

      const id = addNotification('テストメッセージ')
      expect(notifications.value).toHaveLength(1)

      removeNotification(id)
      expect(notifications.value).toHaveLength(0)
    })

    it('すべての通知をクリアできる', () => {
      const { notifications, addNotification, clearAllNotifications } = useNotifications()

      addNotification('メッセージ1')
      addNotification('メッセージ2')
      addNotification('メッセージ3')

      expect(notifications.value).toHaveLength(3)

      clearAllNotifications()
      expect(notifications.value).toHaveLength(0)
    })

    it('特定のタイプの通知をクリアできる', () => {
      const { notifications, addNotification, clearNotificationsByType } = useNotifications()

      addNotification('エラー1', 'error')
      addNotification('警告1', 'warning')
      addNotification('エラー2', 'error')
      addNotification('情報1', 'info')

      expect(notifications.value).toHaveLength(4)

      clearNotificationsByType('error')
      expect(notifications.value).toHaveLength(2)
      expect(notifications.value.every(n => n.type !== 'error')).toBe(true)
    })
  })

  describe('専用ヘルパーメソッド', () => {
    it('showError が適切なタイプと期間で通知を追加する', () => {
      const { notifications, showError } = useNotifications()

      showError('エラーメッセージ')

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('error')
      expect(notifications.value[0].duration).toBe(8000)
      expect(notifications.value[0].message).toBe('エラーメッセージ')
    })

    it('showWarning が適切なタイプと期間で通知を追加する', () => {
      const { notifications, showWarning } = useNotifications()

      showWarning('警告メッセージ')

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('warning')
      expect(notifications.value[0].duration).toBe(6000)
      expect(notifications.value[0].message).toBe('警告メッセージ')
    })

    it('showInfo が適切なタイプと期間で通知を追加する', () => {
      const { notifications, showInfo } = useNotifications()

      showInfo('情報メッセージ')

      expect(notifications.value).toHaveLength(1)
      expect(notifications.value[0].type).toBe('info')
      expect(notifications.value[0].duration).toBe(4000)
      expect(notifications.value[0].message).toBe('情報メッセージ')
    })
  })

  describe('自動削除タイマー', () => {
    it('指定した時間後に通知が自動削除される', () => {
      const { notifications, addNotification } = useNotifications()

      addNotification('テストメッセージ', 'info', 3000)
      expect(notifications.value).toHaveLength(1)

      // 3秒経過
      vi.advanceTimersByTime(3000)
      expect(notifications.value).toHaveLength(0)
    })

    it('duration が 0 の場合は自動削除されない', () => {
      const { notifications, addNotification } = useNotifications()

      addNotification('テストメッセージ', 'info', 0)
      expect(notifications.value).toHaveLength(1)

      // 長時間経過しても削除されない
      vi.advanceTimersByTime(10000)
      expect(notifications.value).toHaveLength(1)
    })
  })

  describe('最大通知数制限', () => {
    it('最大通知数を超えた場合、古い通知を削除する', () => {
      const { notifications, addNotification } = useNotifications()

      // 6個の通知を追加（最大5個を超える）
      for (let i = 1; i <= 6; i++) {
        addNotification(`メッセージ${i}`)
      }

      expect(notifications.value).toHaveLength(5)
      expect(notifications.value[0].message).toBe('メッセージ2') // 最初の通知が削除されている
      expect(notifications.value[4].message).toBe('メッセージ6')
    })
  })

  describe('ユニークID生成', () => {
    it('各通知に一意のIDが生成される', () => {
      const { notifications, addNotification } = useNotifications()

      const id1 = addNotification('メッセージ1')
      const id2 = addNotification('メッセージ2')
      const id3 = addNotification('メッセージ3')

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)

      expect(notifications.value[0].id).toBe(id1)
      expect(notifications.value[1].id).toBe(id2)
      expect(notifications.value[2].id).toBe(id3)
    })

    it('IDが適切な形式で生成される', () => {
      const { addNotification } = useNotifications()

      const id = addNotification('テスト')

      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/)
    })
  })
})
