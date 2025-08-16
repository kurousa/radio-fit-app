/**
 * 通知システム用のComposable
 * Vue コンポーネントでタイムゾーンエラー通知を処理するために使用
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { TimezoneErrorHandler } from '../services/timezoneService'

export interface NotificationItem {
  id: string
  message: string
  type: 'error' | 'warning' | 'info'
  timestamp: Date
  duration?: number // 自動消去までの時間（ミリ秒）
}

/**
 * 通知システムのComposable
 */
export function useNotifications() {
  const notifications = ref<NotificationItem[]>([])
  const maxNotifications = 5 // 同時表示する最大通知数

  /**
   * 通知を追加
   */
  const addNotification = (
    message: string,
    type: 'error' | 'warning' | 'info' = 'info',
    duration: number = 5000,
  ): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    const notification: NotificationItem = {
      id,
      message,
      type,
      timestamp: new Date(),
      duration,
    }

    notifications.value.push(notification)

    // 最大表示数を超えた場合、古い通知を削除
    if (notifications.value.length > maxNotifications) {
      notifications.value.shift()
    }

    // 自動削除タイマーを設定
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }

  /**
   * 通知を削除
   */
  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex((n) => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * すべての通知をクリア
   */
  const clearAllNotifications = (): void => {
    notifications.value.length = 0
  }

  /**
   * 特定のタイプの通知をクリア
   */
  const clearNotificationsByType = (type: 'error' | 'warning' | 'info'): void => {
    for (let i = notifications.value.length - 1; i >= 0; i--) {
      if (notifications.value[i].type === type) {
        notifications.value.splice(i, 1)
      }
    }
  }

  /**
   * TimezoneErrorHandler用のコールバック関数
   */
  const handleTimezoneNotification = (
    message: string,
    type: 'error' | 'warning' | 'info',
  ): void => {
    // タイムゾーンエラーは重要なので長めに表示
    const duration = type === 'error' ? 8000 : type === 'warning' ? 6000 : 4000
    addNotification(message, type, duration)
  }

  /**
   * エラー通知の専用ヘルパー
   */
  const showError = (message: string, duration: number = 8000): string => {
    return addNotification(message, 'error', duration)
  }

  /**
   * 警告通知の専用ヘルパー
   */
  const showWarning = (message: string, duration: number = 6000): string => {
    return addNotification(message, 'warning', duration)
  }

  /**
   * 情報通知の専用ヘルパー
   */
  const showInfo = (message: string, duration: number = 4000): string => {
    return addNotification(message, 'info', duration)
  }

  /**
   * 成功通知の専用ヘルパー（info タイプを使用）
   */
  const showSuccess = (message: string, duration: number = 3000): string => {
    return addNotification(message, 'info', duration)
  }

  // ライフサイクルフックは条件付きで登録（テスト環境では無視）
  try {
    // コンポーネントマウント時にTimezoneErrorHandlerにコールバックを登録
    onMounted(() => {
      TimezoneErrorHandler.registerNotificationCallback(handleTimezoneNotification)
    })

    // コンポーネントアンマウント時にコールバックを削除
    onUnmounted(() => {
      TimezoneErrorHandler.unregisterNotificationCallback(handleTimezoneNotification)
    })
  } catch {
    // テスト環境やコンポーネント外での使用時は手動でコールバックを管理
    TimezoneErrorHandler.registerNotificationCallback(handleTimezoneNotification)
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    clearNotificationsByType,
    showError,
    showWarning,
    showInfo,
    showSuccess,
  }
}
