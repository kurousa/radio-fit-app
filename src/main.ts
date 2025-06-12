import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
// V-Calendarのインポート
import VCalendar from 'v-calendar'
import 'v-calendar/dist/style.css' // V-Calendarのスタイルシート
import { createManager } from '@vue-youtube/core'

const app = createApp(App)

app.use(router)
app.use(VCalendar, {}) // V-Calendarを登録。第二引数はオプション。
app.use(createManager())

app.mount('#app')
