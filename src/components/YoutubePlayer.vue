<script setup lang="ts">
import { YoutubeIframe } from '@vue-youtube/component'
import { defineProps } from 'vue' // `defineProps` をインポート

// props の定義
// videoId を文字列型で必須として受け取る
const props = defineProps<{
  videoId: string
}>()

// width と height はテンプレートに固定値として直接記述
// const width = '800'; // setup スクリプト内では不要
// const height = '450'; // setup スクリプト内では不要
</script>

<template>
  <!-- video-id を props から動的にバインド -->
  <!-- width と height は固定値で指定 -->
  <youtube-iframe :video-id="props.videoId" width="800" height="450" class="youtube-iframe" />
</template>

<style scoped>
/*
  親要素が aspect-ratio を持つ場合、
  YouTubeIframe の width/height は 100% にして
  親要素のサイズに合わせる方がレスポンシブに対応しやすいです。
  もし親の aspect-ratio がない、または常に固定サイズで表示したい場合は、
  width="800" height="450" を直接 iframe に渡す形が適切です。
  ここではユーザーの要望に合わせて固定値を維持しています。
*/
.youtube-iframe {
  /*
    親要素の `player-wrapper` が `position: relative;` と `aspect-ratio` を持っており、
    その内部に `position: absolute; top: 0; left: 0; width: 100%; height: 100%;` を持つ
    子要素（今回の youtube-iframe が生成する要素）を配置するのが、
    レスポンシブな動画埋め込みの一般的なベストプラクティスです。

    現在 `width="800" height="450"` が直接コンポーネントに渡されているため、
    その値が iframe のサイズとして優先されます。
    もし親のサイズに合わせたい場合は、以下のように CSS を適用してください。

    width: 100%;
    height: 100%;
    border: none;
  */
  border: none; /* iframe のボーダーを削除 */
  /* 固定値が優先されるため、以下は動作しない可能性が高いですが、念のため記述 */
  display: block; /* iframe の下に余計なスペースができないように */
}
</style>
