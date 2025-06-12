import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ExercisesView from '../views/ExercisesView.vue' // 仮のコンポーネント
import ProfileView from '../views/ProfileView.vue' // 仮のコンポーネント

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/exercises',
    name: 'exercises',
    component: ExercisesView, // 後でExercisePlayerViewなどと変更
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView, // 後でRecordStatsViewなどと変更
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Viteの場合
  // history: createWebHistory(), // Vue CLIの場合
  routes,
})

export default router
