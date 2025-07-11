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

<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch } from 'vue'
import { getAllRecords } from '../services/recordService' // 記録サービスをインポート
import type { ExerciseRecord } from '../services/recordService'

export default defineComponent({
  name: 'ProfileView',
  setup() {
    // 全ての体操記録を格納するリアクティブ変数
    const allRecords = ref<ExerciseRecord[]>([])

    // 通知設定の状態
    const notificationsEnabled = ref(false)
    // 通知時刻の状態
    const notificationTime = ref('06:30')
    // サポートメールアドレス
    const supportEmail = 'support@example.com'

    // V-Calendarのための属性（ハイライト表示など）
    const calendarAttributes = ref<unknown>([]) // V-Calendarの属性配列

    // 現在の日付を取得
    const today = new Date()
    const currentMonth = today.getMonth() + 1 // 月は0-indexedなので+1
    const currentYear = today.getFullYear()

    // 当月の初期ページ設定
    const calendarInitialPageCurrentMonth = ref({
      month: currentMonth,
      year: currentYear,
    })

    // 前月の初期ページ設定
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1 // 1月なら前年は12月
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear // 1月なら年を1つ減らす
    const calendarInitialPagePrevMonth = ref({
      month: prevMonth,
      year: prevYear,
    })

    /**
     * 計算プロパティ：総実施回数
     * allRecords の長さに基づいて計算される
     */
    const totalExercises = computed(() => allRecords.value.length)

    /**
     * 計算プロパティ：最長連続日数
     * 記録された日付を基に最長の連続日数を計算する
     */
    const longestStreak = computed(() => {
      if (allRecords.value.length === 0) return 0

      let maxStreak = 0
      let currentStreak = 0

      // 記録を日付順にソートする (ISO文字列なので直接比較可能だが、Dateオブジェクトに変換してソートするのがより堅牢)
      const sortedRecords = [...allRecords.value].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })

      // ユニークな日付のみを抽出して連続日数を計算する
      const uniqueDates = Array.from(new Set(sortedRecords.map((record) => record.date))).sort()

      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i])
        currentDate.setHours(0, 0, 0, 0) // 時刻情報をリセット

        if (i === 0) {
          currentStreak = 1 // 最初の日は必ず1日目
        } else {
          const prevDate = new Date(uniqueDates[i - 1])
          prevDate.setHours(0, 0, 0, 0)

          const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // 日数の差を計算

          if (diffDays === 1) {
            // 前の日から1日しか経っていない場合、連続
            currentStreak++
          } else {
            // 連続が途切れた場合
            currentStreak = 1 // 新たな連続開始
          }
        }
        maxStreak = Math.max(maxStreak, currentStreak) // 最長記録を更新
      }
      return maxStreak
    })

    /**
     * 計算プロパティ：モチベーションメッセージ
     * 総実施回数や最長連続日数に応じてメッセージを返す
     */
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

    /**
     * IndexedDBから記録をロードし、allRecordsを更新する
     */
    const loadRecords = async () => {
      allRecords.value = await getAllRecords()
      console.log('記録がロードされました:', allRecords.value)
    }

    /**
     * allRecords の変更を監視し、カレンダー属性を更新する
     */
    const updateCalendarAttributes = () => {
      // 実施記録のある日付をハイライト表示する属性を作成
      const recordedDates = allRecords.value.map((record) => record.date)
      const uniqueRecordedDates = [...new Set(recordedDates)] // 重複する日付を削除

      const attributes = uniqueRecordedDates.map((dateStr) => {
        const date = new Date(dateStr)
        // V-Calendar は日付オブジェクトまたは文字列を受け入れるが、
        // 型の整合性のためDateオブジェクトを使用
        date.setHours(0, 0, 0, 0) // 時刻情報をリセットして日付のみにする

        return {
          key: `recorded-${dateStr}`, // 各属性にユニークなキーを設定
          dates: date, // 対象の日付
          // ハイライト表示の例：背景色を変える
          highlight: {
            color: 'green', // V-Calendarが持つ色名 'green'
            fillMode: 'solid',
            class: 'recorded-date-highlight', // カスタムCSSクラス
          },
          // またはドット表示の例
          // dot: {
          //   color: 'green', // 緑色のドット
          //   class: 'recorded-date-dot' // カスタムCSSクラス
          // },
          popover: {
            // ポップオーバー（日付タップ時に表示）
            label: 'ラジオ体操実施済み！',
          },
        }
      })

      // calendarAttributes を更新
      calendarAttributes.value = attributes
      console.log('カレンダー属性が更新されました:', calendarAttributes.value)
    }

    /**
     * Vueコンポーネントがマウントされた時に実行されるライフサイクルフック
     */
    onMounted(() => {
      loadRecords() // 記録の初期ロード
      // ここで、IndexedDBなどから保存された通知設定をロードするロジックを追加することも可能
      // 例: notificationsEnabled.value = (await localforage.getItem('notificationsEnabled')) || false;
      // 例: notificationTime.value = (await localforage.getItem('notificationTime')) || '06:30';
    })

    /**
     * allRecords の変更を監視し、カレンダーの表示を自動更新する
     * deep: true は配列内のオブジェクトの変更も検知するため（今回の場合は不要だが安全のため）
     */
    watch(
      allRecords,
      () => {
        updateCalendarAttributes()
      },
      { deep: true },
    )

    // 通知設定や時刻の変更を監視し、IndexedDBに保存するロジック（後ほど実装）
    // watch(notificationsEnabled, (newValue) => {
    //   localforage.setItem('notificationsEnabled', newValue);
    // });
    // watch(notificationTime, (newValue) => {
    //   localforage.setItem('notificationTime', newValue);
    // });

    return {
      allRecords,
      totalExercises,
      longestStreak,
      motivationalMessage,
      notificationsEnabled,
      notificationTime,
      supportEmail,
      calendarAttributes,
      calendarInitialPageCurrentMonth,
      calendarInitialPagePrevMonth,
    }
  },
})
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
