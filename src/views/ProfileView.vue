<template>
  <div class="profile-container">
    <h2 class="page-title">あなたの活動記録</h2>

    <section class="records-section">
      <h3>カレンダー</h3>
      <div class="calendar-grid">
        <!-- カレンダー表示エリア -->
        <!-- 各日付セルに、その日の記録有無に応じてマークを表示 -->
        <!-- 簡易的なカレンダー例 (ライブラリの導入を推奨) -->
        <p>ここに月間カレンダーが入ります。</p>
        <p>体操実施日をマークして表示</p>
      </div>
    </section>

    <section class="stats-section">
      <h3>統計</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <p class="stat-label">総実施回数</p>
          <p class="stat-value">{{ totalExercises }}回</p>
        </div>
        <div class="stat-item">
          <p class="stat-label">最長連続日数</p>
          <p class="stat-value">{{ longestStreak }}日</p>
        </div>
        <!-- 他の統計情報（週間/月間実施日数グラフなど） -->
      </div>
      <p class="motivational-message">{{ motivationalMessage }}</p>
    </section>

    <section class="settings-section">
      <h3>設定</h3>
      <div class="setting-item">
        <label for="notification-toggle">通知を有効にする</label>
        <input type="checkbox" id="notification-toggle" v-model="notificationsEnabled" />
      </div>
      <div v-if="notificationsEnabled" class="setting-item">
        <label for="notification-time">通知時刻</label>
        <input type="time" id="notification-time" v-model="notificationTime" />
      </div>
      <!-- 通知音量スライダーなど -->

      <h3 class="help-title">ヘルプ</h3>
      <div class="help-item">
        <p><strong>よくある質問 (FAQ)</strong></p>
        <p>Q: アプリの使い方は？</p>
        <p>A: Home画面から体操を選択し、完了ボタンを押してください。</p>
        <!-- 他のFAQ -->
      </div>
      <div class="help-item">
        <a :href="`mailto:${supportEmail}`" class="contact-link">お問い合わせ</a>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue'
import { getAllRecords, ExerciseRecord } from '../services/recordService'

export default defineComponent({
  name: 'ProfileView',
  setup() {
    const allRecords = ref<ExerciseRecord[]>([])
    const notificationsEnabled = ref(false) // 通知設定の状態
    const notificationTime = ref('06:30') // 通知時刻
    const supportEmail = 'support@example.com' // サポートメールアドレス

    const totalExercises = computed(() => allRecords.value.length)
    const longestStreak = computed(() => {
      if (allRecords.value.length === 0) return 0

      let maxStreak = 0
      let currentStreak = 0
      let lastDate: Date | null = null

      // 日付でソート
      const sortedRecords = [...allRecords.value].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      for (let i = 0; i < sortedRecords.length; i++) {
        const recordDate = new Date(sortedRecords[i].date)
        recordDate.setHours(0, 0, 0, 0)

        if (!lastDate) {
          currentStreak = 1
        } else {
          const diffTime = Math.abs(recordDate.getTime() - lastDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            // 連続している
            currentStreak++
          } else if (diffDays > 1) {
            // 連続が途切れた
            currentStreak = 1
          }
          // 同日内の重複はstreakに影響しない
        }
        maxStreak = Math.max(maxStreak, currentStreak)
        lastDate = recordDate
      }
      return maxStreak
    })

    const motivationalMessage = computed(() => {
      if (totalExercises.value === 0) {
        return 'まだ記録がありません。最初のラジオ体操をしてみましょう！'
      } else if (totalExercises.value < 10) {
        return `素晴らしいスタートです！もう${totalExercises.value}回体操しましたね。`
      } else if (longestStreak.value >= 7) {
        return `1週間以上連続！健康習慣が身についてきましたね！`
      }
      return '継続は力なり！毎日の体操で健康を維持しましょう。'
    })

    const loadRecords = async () => {
      allRecords.value = await getAllRecords()
    }

    onMounted(() => {
      loadRecords()
      // IndexedDBから通知設定などを読み込むロジックもここに記述
    })

    // ウォッチャーや変更時にIndexedDBに保存するロジックも追加
    // watch(notificationsEnabled, (newValue) => { /* IndexedDBに保存 */ });
    // watch(notificationTime, (newValue) => { /* IndexedDBに保存 */ });

    return {
      allRecords,
      totalExercises,
      longestStreak,
      motivationalMessage,
      notificationsEnabled,
      notificationTime,
      supportEmail,
    }
  },
})
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 30px;
  text-align: center;
}

section {
  background-color: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
}

h3 {
  font-size: 22px;
  color: #007bff;
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}

.calendar-grid {
  /* カレンダーのグリッドスタイル */
  min-height: 200px; /* 仮の高さ */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f8f8f8;
  border-radius: 10px;
  color: #666;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  text-align: center;
}

.stat-item {
  background-color: #e6f2ff; /* 明るい青 */
  padding: 20px;
  border-radius: 12px;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05);
}
.stat-label {
  font-size: 16px;
  color: #555;
  margin-bottom: 5px;
}
.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #007bff;
}

.motivational-message {
  margin-top: 25px;
  font-size: 18px;
  font-style: italic;
  color: #444;
  text-align: center;
  line-height: 1.5;
}

.settings-section .setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}
.settings-section .setting-item:last-child {
  border-bottom: none;
}
.settings-section label {
  font-size: 18px;
  color: #333;
}
.settings-section input[type='checkbox'] {
  transform: scale(1.5); /* チェックボックスを少し大きく */
}
.settings-section input[type='time'] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.help-title {
  margin-top: 30px;
}

.help-item {
  margin-bottom: 15px;
  line-height: 1.6;
}
.help-item strong {
  color: #007bff;
}
.contact-link {
  display: inline-block;
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: background-color 0.2s;
}
.contact-link:hover {
  background-color: #0056b3;
}
</style>
