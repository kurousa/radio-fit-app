<template>
  <div class="exercises-container">
    <div class="video-selection-buttons">
      <button
        @click="selectExercise('first')"
        :class="{ active: selectedExerciseType === 'first' }"
      >
        ラジオ体操 第一
      </button>
      <button
        @click="selectExercise('second')"
        :class="{ active: selectedExerciseType === 'second' }"
      >
        ラジオ体操 第二
      </button>
    </div>

    <div class="player-wrapper">
      <!-- YouTubePlayer コンポーネントを使用 -->
      <!-- isAudioOnlyMode が false の時のみ動画プレイヤーを表示 -->
      <YouTubePlayer
        v-if="!isAudioOnlyMode"
        :video-id="videoIds[selectedExerciseType]"
        class="youtube-player-component"
      />
      <!-- <YouTubePlayer
        v-if="!isAudioOnlyMode"
        :video-id="videoIds[selectedExerciseType]"
        class="youtube-player-component"
      /> -->

      <!-- 音声のみモード時に表示するコンテンツ -->
      <div v-if="isAudioOnlyMode" class="audio-only-visual">
        <img
          src="@/assets/radio-taiso-illustration.png"
          alt="ラジオ体操"
          class="taiso-illustration"
        />
        <p class="audio-status-text">音声のみ再生中...</p>
        <button @click="toggleAudioOnly" class="toggle-video-button">動画に戻す</button>
      </div>
    </div>

    <div class="controls">
      <button @click="toggleAudioOnly" class="audio-toggle-button">
        {{ isAudioOnlyMode ? '動画ありで再生' : '音声のみ' }}
      </button>
      <button @click="completeExercise" class="complete-button">Exercise Completed</button>
    </div>

    <!-- 体操完了時のポップアップ -->
    <div v-if="showCompletionPopup" class="completion-popup">
      <div class="popup-content">
        <p>お疲れ様でした！</p>
        <p>素晴らしいです！</p>
      </div>
    </div>

    <!-- エラー時のポップアップ -->
    <div v-if="showErrorPopup" class="error-popup">
      <div class="popup-content">
        <p>⚠️ エラーが発生しました</p>
        <p>{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue'
import { recordExerciseWithTimezone } from '../services/recordService' // タイムゾーン対応記録サービスをインポート
import { TimezoneErrorHandler } from '../services/timezoneService' // エラーハンドリング用
import { useRoute } from 'vue-router' // ルーティングからクエリパラメータを取得するために追加

// 新しく作成した YouTubePlayer コンポーネントをインポート
import YouTubePlayer from '../components/YoutubePlayer.vue'

export default defineComponent({
  name: 'ExercisesView',
  components: {
    YouTubePlayer, // テンプレートで使用するために登録
  },
  setup() {
    const route = useRoute()

    // リアクティブな状態変数
    const isAudioOnlyMode = ref(false) // 音声のみモードかどうかのフラグ
    const showCompletionPopup = ref(false) // 完了ポップアップ表示フラグ
    const selectedExerciseType = ref<'first' | 'second'>('first') // 選択中の体操タイプ
    const errorMessage = ref<string>('') // エラーメッセージ表示用
    const showErrorPopup = ref(false) // エラーポップアップ表示フラグ

    // ラジオ体操動画のYouTube IDマップ
    const videoIds = {
      first: '_YZZfaMGEOU', // ラジオ体操第一のYouTube動画IDの例
      second: 'yi1TbzML2cU', // ラジオ体操第二のYouTube動画IDの例
    }

    /**
     * 音声のみモードの切り替え
     * `YouTubePlayer` コンポーネントの `v-if` を切り替えることで表示/非表示を制御
     * 動画のミュート/ミュート解除は `YoutubeIframe` コンポーネントの `vars` prop で設定可能ですが、
     * この簡潔な実装では `v-if` による DOM の追加/削除で動画の再生/停止を制御します。
     * 音声のみモードでは動画コンポーネント自体を削除し、音声のみの視覚表現に切り替えます。
     */
    const toggleAudioOnly = () => {
      isAudioOnlyMode.value = !isAudioOnlyMode.value
      // v-if が切り替わることで、YoutubeIframe が自動的にロード/アンロードされる
    }

    /**
     * 体操完了ボタンの処理
     * タイムゾーン対応記録サービスを使用して記録を保存し、ポップアップを表示
     * 動画を停止するために `YouTubePlayer` をDOMから削除する
     */
    const completeExercise = async () => {
      try {
        // タイムゾーン対応記録サービスを使用して記録を保存
        // ユーザーのローカルタイムゾーンが自動検出・保存される
        await recordExerciseWithTimezone(selectedExerciseType.value)

        // 完了ポップアップを表示
        showCompletionPopup.value = true
        setTimeout(() => {
          showCompletionPopup.value = false
        }, 2000) // 2秒後にポップアップを非表示

        // 体操完了時は音声のみモードに切り替えて動画を停止する（コンポーネントをDOMから削除）
        isAudioOnlyMode.value = true

        console.log(`タイムゾーン対応記録が完了しました: ${selectedExerciseType.value}`)
      } catch (error) {
        // エラー時のユーザー通知
        console.error('記録の保存中にエラーが発生しました:', error)

        // エラーメッセージを設定
        errorMessage.value = '記録の保存に失敗しました。もう一度お試しください。'

        // エラーポップアップを表示
        showErrorPopup.value = true
        setTimeout(() => {
          showErrorPopup.value = false
          errorMessage.value = ''
        }, 3000) // 3秒後にエラーポップアップを非表示

        // TimezoneErrorHandlerを使用してエラーログを出力
        TimezoneErrorHandler.showUserNotification(`記録保存エラー: ${error}`)
      }
    }

    /**
     * 体操タイプを選択し、動画をロードする
     * `selectedExerciseType` の変更は `YouTubePlayer` に `videoId` prop 経由で伝わる
     */
    const selectExercise = (type: 'first' | 'second') => {
      selectedExerciseType.value = type
      isAudioOnlyMode.value = false // 動画選択時は動画モードに戻す
      // `YouTubePlayer` コンポーネントが `videoId` prop の変更を検知して動画をロードします。
    }

    // コンポーネントがマウントされた時に実行
    onMounted(() => {
      // ルートのクエリパラメータから体操タイプを初期設定
      if (route.query.type === 'first' || route.query.type === 'second') {
        selectedExerciseType.value = route.query.type
      } else {
        // もし特定の体操がHomeViewから選択されていなければ、デフォルトで第一をロード
        selectedExerciseType.value = 'first'
      }
    })

    // `selectedExerciseType` の変更を監視。
    // `YouTubePlayer` は `v-if` で制御されているため、
    // `isAudioOnlyMode` が `false` になると自動的に再描画され、新しい `videoId` でロードされます。
    // ここでの `watch` は主に `isAudioOnlyMode` のリセットのため。
    watch(selectedExerciseType, () => {
      // 選択した体操が切り替わったら、自動的に動画モードにする
      isAudioOnlyMode.value = false
    })

    // コンポーネントがアンマウントされる際に、もし動画が表示中なら音声のみモードに戻す
    onUnmounted(() => {
      isAudioOnlyMode.value = true
    })

    // テンプレートに公開する変数と関数
    return {
      isAudioOnlyMode,
      showCompletionPopup,
      selectedExerciseType,
      videoIds, // videoId prop に直接使用するため公開
      errorMessage, // エラーメッセージ
      showErrorPopup, // エラーポップアップ表示フラグ
      toggleAudioOnly,
      completeExercise,
      selectExercise,
    }
  },
})
</script>

<style scoped>
.exercises-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  max-width: 900px; /* 全体の最大幅 */
  margin: 0 auto; /* 中央寄せ */
}

.video-selection-buttons {
  margin-bottom: 25px;
  display: flex;
  gap: 15px;
}

.video-selection-buttons button {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  border: 2px solid #007bff;
  border-radius: 8px;
  background-color: white;
  color: #007bff;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.video-selection-buttons button:hover {
  background-color: #e6f2ff;
}

.video-selection-buttons button.active {
  background-color: #007bff;
  color: white;
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
}

.player-wrapper {
  position: relative;
  width: 100%;
  max-width: 800px; /* 動画プレイヤーの最大幅 */
  aspect-ratio: 16 / 9; /* 16:9のアスペクト比を維持 */
  background-color: #e0e0e0; /* 動画が読み込まれるまでの背景色 */
  border-radius: 12px;
  overflow: hidden; /* 角丸にするために必要 */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
}

/* YouTubePlayer コンポーネント自体のスタイルを適用 */
.youtube-player-component {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* `v-if` でコンポーネントの表示/非表示を制御するため、opacity は不要 */
  /* transition: opacity 0.3s ease-in-out; */
}

.audio-only-visual {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #c4e0f0; /* 明るい青系の背景 */
  color: #333;
  text-align: center;
  padding: 20px;
}

.taiso-illustration {
  max-width: 60%;
  height: auto;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)); /* イラストに影 */
}

.audio-status-text {
  font-size: 20px;
  font-weight: bold;
  color: #555;
}

.toggle-video-button {
  margin-top: 25px;
  padding: 12px 25px;
  background-color: #555;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: background-color 0.2s ease-in-out;
}
.toggle-video-button:hover {
  background-color: #777;
}

.controls {
  margin-top: 30px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap; /* ボタンが複数行になる場合に対応 */
  justify-content: center;
}

.audio-toggle-button,
.complete-button {
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease-in-out;
  min-width: 200px; /* ボタンの最小幅 */
}

.audio-toggle-button {
  background-color: #a0a0a0; /* グレー系 */
  color: white;
}
.audio-toggle-button:hover {
  background-color: #888;
}

.complete-button {
  background-color: #007bff; /* メインカラー */
  color: white;
}
.complete-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
}

/* 完了ポップアップのスタイル */
.completion-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.75); /* 半透明の黒背景 */
  color: white;
  padding: 30px 50px;
  border-radius: 15px;
  text-align: center;
  font-size: 26px;
  font-weight: bold;
  z-index: 1000;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.3s ease-out; /* ポップアップ表示アニメーション */
}

.completion-popup .popup-content p {
  margin: 5px 0;
}

/* エラーポップアップのスタイル */
.error-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(220, 53, 69, 0.9); /* 赤系の半透明背景 */
  color: white;
  padding: 25px 40px;
  border-radius: 15px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  z-index: 1000;
  box-shadow: 0 8px 20px rgba(220, 53, 69, 0.4);
  animation: fadeIn 0.3s ease-out;
  max-width: 400px;
}

.error-popup .popup-content p {
  margin: 8px 0;
}

.error-popup .popup-content p:first-child {
  font-size: 20px;
  margin-bottom: 12px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -60%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .exercises-container {
    padding: 15px;
  }
  .player-wrapper {
    max-width: 100%; /* 小画面では幅いっぱいに */
  }
  .controls {
    flex-direction: column; /* ボタンを縦に並べる */
    gap: 15px;
  }
  .audio-toggle-button,
  .complete-button {
    width: 100%; /* 幅いっぱいに */
    min-width: unset;
  }
  .completion-popup {
    font-size: 20px;
    padding: 20px 30px;
  }
}
</style>
