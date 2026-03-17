<template>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="app-header">
    <div class="logo">RadioFit</div>
    <nav class="main-nav" aria-label="Main Navigation">
      <router-link to="/">Home</router-link>
      <router-link to="/exercises">Exercises</router-link>
      <router-link to="/profile">Profile</router-link>
    </nav>
    <div class="user-icon">
      <router-link to="/profile" aria-label="User Profile" title="User Profile">
        <img src="@/assets/logo.svg" alt="" class="profile-icon" />
      </router-link>
    </div>
  </header>
  <main class="app-content" id="main-content">
    <router-view />
  </main>

  <!-- グローバル通知システム -->
  <NotificationToast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import NotificationToast from './components/NotificationToast.vue'
import { registerServiceWorker } from '@/services/notificationService'

onMounted(() => {
  registerServiceWorker()
})
</script>

<style>
/* Skip link for accessibility */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #007bff;
  color: white;
  padding: 8px;
  z-index: 100;
  transition: top 0.2s;
  text-decoration: none;
}
.skip-link:focus {
  top: 0;
}

/* ヘッダーの基本スタイル */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: var(--color-background-soft); /* 明るい背景色 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.logo {
  color: var(--color-text);
  color: var(--color-text);
  font-weight: bold;
  font-size: 20px;
}
.main-nav a {
  margin-left: 20px;
  text-decoration: none;
  color: var(--color-text);
  font-weight: 500;
  padding: 5px; /* Increase hit area slightly */
  border-radius: 4px; /* for focus ring */
}
.main-nav a:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
.main-nav a.router-link-exact-active {
  color: #007bff; /* アクティブなリンクの色 */
}
.user-icon a {
  display: inline-block;
  border-radius: 50%;
}
.user-icon a:focus-visible {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
.profile-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: block; /* prevents small gap below image */
  /* 一旦仮のアイコン、または本物のユーザーアイコン */
}
.app-content {
  padding: 20px; /* 必要に応じて調整 */
}
</style>
