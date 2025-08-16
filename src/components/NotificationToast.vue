<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'notification-toast',
            `notification-${notification.type}`
          ]"
          @click="removeNotification(notification.id)"
        >
          <div class="notification-content">
            <div class="notification-icon">
              <span v-if="notification.type === 'error'">⚠️</span>
              <span v-else-if="notification.type === 'warning'">⚠️</span>
              <span v-else>ℹ️</span>
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
            <button
              class="notification-close"
              @click.stop="removeNotification(notification.id)"
              aria-label="通知を閉じる"
            >
              ×
            </button>
          </div>
          <div
            v-if="notification.duration && notification.duration > 0"
            class="notification-progress"
            :style="{ animationDuration: `${notification.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// This is a placeholder. A real implementation would use a dedicated toast notification composable.
const notifications = ref<any[]>([])
const removeNotification = (id: number) => {
  notifications.value = notifications.value.filter((n) => n.id !== id)
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.notification-toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 12px;
  max-width: 400px;
  min-width: 300px;
  overflow: hidden;
  pointer-events: auto;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.notification-toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.notification-content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  word-wrap: break-word;
}

.notification-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background-color: #f0f0f0;
  color: #333;
}

.notification-progress {
  height: 3px;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  animation: progress-bar linear forwards;
  transform-origin: left;
}

@keyframes progress-bar {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* タイプ別のスタイル */
.notification-error {
  border-left: 4px solid #f44336;
}

.notification-error .notification-progress {
  background: linear-gradient(90deg, #f44336, #d32f2f);
}

.notification-warning {
  border-left: 4px solid #ff9800;
}

.notification-warning .notification-progress {
  background: linear-gradient(90deg, #ff9800, #f57c00);
}

.notification-info {
  border-left: 4px solid #2196f3;
}

.notification-info .notification-progress {
  background: linear-gradient(90deg, #2196f3, #1976d2);
}

/* アニメーション */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* レスポンシブ対応 */
@media (max-width: 480px) {
  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
  }

  .notification-toast {
    min-width: auto;
    max-width: none;
  }

  .notification-content {
    padding: 12px;
    gap: 8px;
  }

  .notification-message {
    font-size: 13px;
  }

  .notification-icon {
    font-size: 18px;
  }
}

/* ダークモード対応（将来的な拡張用） */
@media (prefers-color-scheme: dark) {
  .notification-toast {
    background: #2d2d2d;
    color: #fff;
  }

  .notification-message {
    color: #fff;
  }

  .notification-close {
    color: #ccc;
  }

  .notification-close:hover {
    background-color: #404040;
    color: #fff;
  }
}
</style>
