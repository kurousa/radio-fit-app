<template>
  <div class="exercises-container">
    <!-- 体操選択ボタンなど -->
    <div class="player-wrapper">
      <div id="youtube-player" :class="{ 'hidden-video': isAudioOnlyMode }"></div>
      <div v-if="isAudioOnlyMode" class="audio-only-visual">
        <!-- ラジオ体操のイラストやシンプルな波形表示 -->
        <img
          src="@/assets/radio-taiso-illustration.png"
          alt="ラジオ体操"
          class="taiso-illustration"
        />
        <p>音声のみ再生中...</p>
        <button @click="toggleAudioOnly" class="toggle-video-button">動画に戻す</button>
      </div>
    </div>

    <div class="controls">
      <button @click="toggleAudioOnly" class="audio-toggle-button">
        {{ isAudioOnlyMode ? '動画ありで再生' : '音声のみ' }}
      </button>
      <button @click="completeExercise" class="complete-button">Exercise Completed</button>
    </div>

    <!-- 完了ポップアップ -->
    <div v-if="showCompletionPopup" class="completion-popup">
      <div class="popup-content">
        <p>お疲れ様でした！</p>
        <p>素晴らしいです！</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { recordExercise } from '../services/recordService' // ステップ5で作成

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void
    player: any // YouTube Player インスタンスの型定義
  }
}

export default defineComponent({
  name: 'ExercisesView',
  setup() {
    const isAudioOnlyMode = ref(false)
    const showCompletionPopup = ref(false)
    let player: YT.Player | null = null // YouTube Player インスタンス

    const currentVideoId = ref('_YZZfaMGEOU') // ラジオ体操第一の仮のID

    const loadYoutubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        player = new window.YT.Player('youtube-player', {
          videoId: currentVideoId.value,
          height: '360',
          width: '640',
          playerVars: {
            playsinline: 1,
            rel: 0, // 関連動画を表示しない
            modestbranding: 1, // YouTubeロゴを控えめに
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        })
      } else {
        // APIがまだ読み込まれていない場合、少し待って再試行
        setTimeout(initPlayer, 100)
      }
    }

    const onPlayerReady = (event: YT.PlayerEvent) => {
      // プレイヤー準備完了
      console.log('YouTube Player Ready')
      // event.target.playVideo(); // 必要に応じて自動再生
    }

    const onPlayerStateChange = (event: YT.PlayerEvent) => {
      // プレイヤーの状態が変更された時 (再生、一時停止など)
      console.log('Player state changed:', event.data)
    }

    const toggleAudioOnly = () => {
      isAudioOnlyMode.value = !isAudioOnlyMode.value
      if (player) {
        if (isAudioOnlyMode.value) {
          player.mute() // 音声モードではミュートして動画を非表示
          // player.stopVideo(); // 動画を停止しても良い
          // player.setPlaybackRate(0); // 再生速度を0にして実質停止
        } else {
          player.unMute()
          // player.playVideo(); // 動画に戻す際に再生を再開
        }
      }
    }

    const completeExercise = async () => {
      await recordExercise(new Date().toISOString().slice(0, 10), 'first') // 今日の日付とラジオ体操第一で記録
      showCompletionPopup.value = true
      setTimeout(() => {
        showCompletionPopup.value = false
      }, 2000) // 2秒後にポップアップを非表示
      if (player) {
        player.stopVideo() // 体操完了で動画を停止
      }
    }

    onMounted(() => {
      // YouTube APIが読み込まれたらプレイヤーを初期化
      window.onYouTubeIframeAPIReady = initPlayer
      loadYoutubeAPI()
    })

    onUnmounted(() => {
      // コンポーネントがアンマウントされる際にプレイヤーを破棄
      if (player) {
        player.destroy()
        player = null
      }
    })

    return {
      isAudioOnlyMode,
      showCompletionPopup,
      toggleAudioOnly,
      completeExercise,
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
}

.player-wrapper {
  position: relative;
  width: 100%;
  max-width: 800px; /* 動画プレイヤーの最大幅 */
  aspect-ratio: 16 / 9; /* 16:9のアスペクト比を維持 */
  background-color: #e0e0e0; /* 動画が読み込まれるまでの背景色 */
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

#youtube-player {
  width: 100%;
  height: 100%;
}

.hidden-video {
  /* 音声のみモードで動画を完全に隠すためのスタイル */
  opacity: 0;
  pointer-events: none; /* クリックイベントも無効化 */
  position: absolute; /* 親要素の同じ位置に重なるようにする */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
}

.taiso-illustration {
  max-width: 60%;
  height: auto;
  margin-bottom: 20px;
}

.toggle-video-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #555;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.toggle-video-button:hover {
  background-color: #777;
}

.controls {
  margin-top: 30px;
  display: flex;
  gap: 20px;
}

.audio-toggle-button,
.complete-button {
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease-in-out;
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
}

/* 完了ポップアップのスタイル */
.completion-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 25px 40px;
  border-radius: 15px;
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  z-index: 1000;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}
</style>
