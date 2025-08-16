<template>
  <div class="profile-container">
    <h2 class="page-title">あなたの活動記録</h2>

    <section class="records-section">
      <h3>カレンダー</h3>
      <div class="calendar-wrapper">
        <!-- V-Calendar コンポーネント (前月) -->
        <VCalendar
          :attributes="calendarAttributes"
          :initial-page="calendarInitialPagePrevMonth"
          class="custom-calendar"
        />
        <!-- V-Calendar コンポーネント (当月) -->
        <VCalendar
          :attributes="calendarAttributes"
          :initial-page="calendarInitialPageCurrentMonth"
          class="custom-calendar"
        />
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
        <!-- 将来的に週間/月間実施日数グラフなどをここに追加 -->
      </div>
      <p class="motivational-message">{{ motivationalMessage }}</p>
    </section>

    <section class="settings-section">
      <h3>設定</h3>
      <div class="setting-item">
        <label for="notification-toggle">通知を有効にする</label>
        <!-- 通知のオン/オフを切り替えるチェックボックス -->
        <input type="checkbox" id="notification-toggle" v-model="notificationsEnabled" />
      </div>
      <div v-if="notificationsEnabled" class="setting-item">
        <label for="notification-time">通知時刻</label>
        <!-- 通知時刻を設定する input type="time" -->
        <input type="time" id="notification-time" v-model="notificationTime" />
      </div>
      <!-- 通知音量スライダーやその他の設定項目をここに追加 -->

      <h3 class="help-title">ヘルプ</h3>
      <div class="help-item">
        <p><strong>よくある質問 (FAQ)</strong></p>
        <p>Q: アプリの使い方は？<br />A: Home画面から体操を選択し、完了ボタンを押してください。</p>
        <p>
          Q: 記録が反映されないのですが？<br />A: 体操完了ボタンを押し忘れていないかご確認ください。
        </p>
        <!-- 他のFAQをここに追加 -->
      </div>
      <div class="help-item">
        <!-- お問い合わせメールリンク -->
        <a :href="`mailto:${supportEmail}`" class="contact-link">お問い合わせ</a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { getAllRecords, getRecordsWithTimezoneConversion } from '../services/recordService'
import type { ExerciseRecord } from '../services/recordService'
import { TimezoneService } from '../services/timezoneService'
import { DateUtils } from '../services/dateUtils'
import { timezoneChangeDetector } from '../services/timezoneChangeDetector'
import { useNotifications } from '@/composables/useNotifications'

// Notifications
const { isEnabled: notificationsEnabled, notificationTime } = useNotifications()

// All other existing setup logic
const allRecords = ref<ExerciseRecord[]>([])
const supportEmail = 'support@example.com'
const currentTimezone = ref<string>('')
let unsubscribeTimezoneChange: (() => void) | null = null
const calendarAttributes = ref<unknown>([])
const today = new Date()
const currentMonth = today.getMonth() + 1
const currentYear = today.getFullYear()
const calendarInitialPageCurrentMonth = ref({
  month: currentMonth,
  year: currentYear,
})
const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
const calendarInitialPagePrevMonth = ref({
  month: prevMonth,
  year: prevYear,
})
const totalExercises = computed(() => allRecords.value.length)
const longestStreak = computed(() => {
  if (allRecords.value.length === 0) return 0
  try {
    return DateUtils.calculateStreakWithTimezone(allRecords.value)
  } catch (error) {
    console.error('タイムゾーン対応連続日数計算に失敗しました:', error)
    let maxStreak = 0
    let currentStreak = 0
    const sortedRecords = [...allRecords.value].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
    const uniqueDates = Array.from(new Set(sortedRecords.map((record) => record.date))).sort()
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i] + 'T12:00:00')
      if (i === 0) {
        currentStreak = 1
      } else {
        const prevDate = new Date(uniqueDates[i - 1] + 'T12:00:00')
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentStreak++
        } else {
          currentStreak = 1
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak)
    }
    return maxStreak
  }
})
const motivationalMessage = computed(() => {
  if (totalExercises.value === 0) {
    return 'まだ記録がありません。最初のラジオ体操をしてみましょう！'
  } else if (totalExercises.value < 10) {
    return `素晴らしいスタートです！もう${totalExercises.value}回体操しましたね。`
  } else if (longestStreak.value >= 7) {
    return `1週間以上連続！健康習慣が身についてきましたね！この調子で頑張りましょう！`
  }
  return '継続は力なり！毎日の体操で健康を維持しましょう。'
})
const loadRecords = async () => {
  try {
    allRecords.value = await getRecordsWithTimezoneConversion()
    console.log('タイムゾーン対応記録がロードされました:', allRecords.value)
  } catch (error) {
    console.error('記録の読み込みに失敗しました:', error)
    allRecords.value = await getAllRecords()
  }
}
const updateCalendarAttributes = () => {
  try {
    const currentTimezone = TimezoneService.getCurrentTimezoneInfo().timezone
    const calendarDates = DateUtils.convertRecordsForCalendar(allRecords.value, currentTimezone)
    const attributes = calendarDates.map((calendarDate) => {
      const { date, records, localDateString } = calendarDate
      const recordDetails = records
        .map((record) => {
          const exerciseType = record.type === 'first' ? 'ラジオ体操第一' : 'ラジオ体操第二'
          let timeInfo = ''
          if (record.timezone) {
            const utcTime = new Date(record.timestamp)
            const timeString = utcTime.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: record.timezone,
            })
            const timezoneAbbr = record.timezone.split('/').pop() || record.timezone
            timeInfo = ` (${timeString} ${timezoneAbbr})`
          } else if (record.timestamp) {
            const utcTime = new Date(record.timestamp)
            const localTime = TimezoneService.convertUTCToLocal(record.timestamp, currentTimezone)
            const timeString = localTime.toLocaleTimeString('ja-JP', {
              hour: '2-digit',
              minute: '2-digit',
            })
            timeInfo = ` (${timeString})`
          }
          return `${exerciseType}${timeInfo}`
        })
        .join('\n')
      const recordCount = records.length
      const popoverLabel =
        recordCount === 1 ? recordDetails : `${recordCount}回実施\n${recordDetails}`
      return {
        key: `recorded-${localDateString}`,
        dates: date,
        highlight: {
          color: 'green',
          fillMode: 'solid' as const,
          class: 'recorded-date-highlight',
        },
        popover: {
          label: popoverLabel,
          visibility: 'hover' as const,
        },
      }
    })
    calendarAttributes.value = attributes
    console.log(`カレンダー属性が更新されました (${currentTimezone}):`, calendarAttributes.value)
  } catch (error) {
    console.error('カレンダー属性の更新に失敗しました:', error)
    const recordedDates = allRecords.value.map((record) => record.date)
    const uniqueRecordedDates = [...new Set(recordedDates)]
    const fallbackAttributes = uniqueRecordedDates.map((dateStr) => {
      const date = new Date(dateStr + 'T12:00:00')
      return {
        key: `recorded-${dateStr}`,
        dates: date,
        highlight: {
          color: 'green',
          fillMode: 'solid' as const,
          class: 'recorded-date-highlight',
        },
        popover: {
          label: 'ラジオ体操実施済み！',
        },
      }
    })
    calendarAttributes.value = fallbackAttributes
    console.log('フォールバック方式でカレンダー属性を更新しました:', calendarAttributes.value)
  }
}
const handleTimezoneChange = async (newTimezone: string, oldTimezone: string) => {
  console.log(`ProfileView: タイムゾーン変更を検出: ${oldTimezone} → ${newTimezone}`)
  currentTimezone.value = newTimezone
  await loadRecords()
  console.log('ProfileView: カレンダー表示が新しいタイムゾーンで更新されました')
}
onMounted(async () => {
  try {
    currentTimezone.value = timezoneChangeDetector.getCurrentTimezone()
  } catch (error) {
    console.error('初期タイムゾーン設定に失敗しました:', error)
  }
  await loadRecords()
  if (!timezoneChangeDetector.isMonitoring()) {
    timezoneChangeDetector.startMonitoring()
  }
  unsubscribeTimezoneChange = timezoneChangeDetector.onTimezoneChange(handleTimezoneChange)
})
onUnmounted(() => {
  if (unsubscribeTimezoneChange) {
    unsubscribeTimezoneChange()
    unsubscribeTimezoneChange = null
  }
})
watch(
  allRecords,
  () => {
    updateCalendarAttributes()
  },
  { deep: true }
)
</script>

<style scoped>
/* コンポーネント全体のコンテナ */
.profile-container {
  padding: 20px;
  max-width: 900px; /* 最大幅を設定して、PCでの見栄えを良くする */
  margin: 0 auto; /* 中央寄せ */
}

/* ページタイトル */
.page-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 30px;
  text-align: center;
}

/* 各セクションの共通スタイル */
section {
  background-color: white;
  padding: 25px;
  border-radius: 15px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08); /* 影 */
  margin-bottom: 30px;
}

/* セクションの見出し */
h3 {
  font-size: 22px;
  color: #007bff; /* メインカラー */
  margin-bottom: 20px;
  border-bottom: 2px solid #e0e0e0; /* 下線 */
  padding-bottom: 10px;
}

/* カレンダーラッパー */
.calendar-wrapper {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
  padding: 20px;
  margin-bottom: 30px;
  display: flex; /* Flexboxコンテナ */
  flex-wrap: wrap; /* 必要に応じて折り返す */
  gap: 20px; /* カレンダー間の間隔 */
  justify-content: center; /* 子要素が複数行に分かれた場合に中央寄せ */
}

/* V-Calendarのカスタムスタイル */
.custom-calendar {
  width: 100%; /* 親要素の幅いっぱいに */
  flex: 1; /* Flexアイテムとして利用可能なスペースを均等に埋める */
  min-width: 300px; /* カレンダーの最小幅を設定（小さくなりすぎないように） */
  /* max-width: none; */ /* 明示的に最大幅の制限を解除 - 今回はflex:1とmin-widthで十分 */
  font-family: 'Inter', sans-serif; /* フォントをアプリ全体と合わせる */
}

/* V-Calendarのデフォルトスタイルを上書きするためのカスタムクラス */
/* `highlight`属性で指定した`class`プロパティが適用されます */
.recorded-date-highlight {
  /* V-Calendarのデフォルトのハイライトスタイルを上書き */
  background-color: #28a745 !important; /* 体操実施日を明るい緑色でハイライト */
  color: white !important; /* テキスト色を白に */
  border-radius: 50% !important; /* 日付セルを丸くする */
  /* padding: 8px !important; /* パディングでハイライトの大きさを調整 */
}

/* 統計セクションのグリッド */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* レスポンシブなグリッド */
  gap: 20px;
  text-align: center;
}

/* 各統計項目 */
.stat-item {
  background-color: #e6f2ff; /* 明るい青 */
  padding: 20px;
  border-radius: 12px;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.05); /* 内側の影 */
}
.stat-label {
  font-size: 16px;
  color: #555;
  margin-bottom: 5px;
}
.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #007bff; /* メインカラー */
  line-height: 1;
}

/* モチベーションメッセージ */
.motivational-message {
  margin-top: 25px;
  font-size: 18px;
  font-style: italic;
  color: #444;
  text-align: center;
  line-height: 1.5;
}

/* 設定セクションの項目 */
.settings-section .setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eee; /* 項目間の区切り線 */
}
.settings-section .setting-item:last-child {
  border-bottom: none; /* 最後の項目は下線なし */
}
.settings-section label {
  font-size: 18px;
  color: #333;
}
.settings-section input[type='checkbox'] {
  transform: scale(1.5); /* チェックボックスを少し大きく表示 */
  cursor: pointer;
}
.settings-section input[type='time'] {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

/* ヘルプセクション */
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

/* レスポンシブ対応の調整 (例) */
@media (max-width: 768px) {
  .profile-container {
    padding: 15px;
  }
  .page-title {
    font-size: 24px;
    margin-bottom: 20px;
  }
  h3 {
    font-size: 20px;
  }
  .stats-grid {
    grid-template-columns: 1fr; /* 小画面では1列表示 */
  }
  .stat-value {
    font-size: 48px;
  }
  .motivational-message {
    font-size: 16px;
  }
  .settings-section label {
    font-size: 16px;
  }
  .calendar-wrapper {
    flex-direction: column; /* 小画面では縦に並べる */
    align-items: center; /* 各カレンダーを中央寄せ */
  }
  .custom-calendar {
    max-width: 400px; /* 小画面での個々のカレンダーの最大幅 */
  }
}
</style>
