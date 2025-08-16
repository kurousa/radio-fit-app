<template>
  <header class="app-header">
    <div class="logo">RadioFit</div>
    <nav class="main-nav">
      <router-link to="/">Home</router-link>
      <router-link to="/exercises">Exercises</router-link>
      <router-link to="/profile">Profile</router-link>
    </nav>
    <div class="user-icon">
      <router-link to="/profile">
        <img src="@/assets/logo.svg" alt="Profile" class="profile-icon" />
      </router-link>
    </div>
  </header>
  <main class="app-content">
    <router-view />
  </main>

  <!-- グローバル通知システム -->
  <NotificationToast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import NotificationToast from './components/NotificationToast.vue'

onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('Service Worker registered with scope:', registration.scope)
      },
      (error) => {
        console.error('Service Worker registration failed:', error)
      }
    )
  }
})
</script>

<style>
/* ヘッダーの基本スタイル */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f8f8f8; /* 明るい背景色 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.logo {
  font-weight: bold;
  font-size: 20px;
}
.main-nav a {
  margin-left: 20px;
  text-decoration: none;
  color: #333;
  font-weight: 500;
}
.main-nav a.router-link-exact-active {
  color: #007bff; /* アクティブなリンクの色 */
}
.profile-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  /* 一旦仮のアイコン、または本物のユーザーアイコン */
}
.app-content {
  padding: 20px; /* 必要に応じて調整 */
}
</style>
