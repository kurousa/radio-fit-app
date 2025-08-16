import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST || [])

const DB_NAME = 'notification-scheduler-db'
const STORE_NAME = 'schedules'
const SCHEDULE_KEY = 'next-notification-schedule'

let timeoutId = null

// --- IndexedDB Helper Functions ---

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getSchedule() {
  const db = await openDb()
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(SCHEDULE_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = (e) => {
      console.error('Error getting schedule from IndexedDB', e)
      resolve(null)
    }
  })
}

async function setSchedule(schedule) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    const store = transaction.objectStore(STORE_NAME)
    store.put(schedule, SCHEDULE_KEY)
  })
}

async function clearSchedule() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    const store = transaction.objectStore(STORE_NAME)
    store.delete(SCHEDULE_KEY)
  })
}

// --- Notification Logic ---

async function scheduleNotification(time) {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }

  const now = new Date()
  const [hours, minutes] = time.split(':').map(Number)

  const notificationTime = new Date()
  notificationTime.setHours(hours, minutes, 0, 0)

  if (notificationTime.getTime() <= now.getTime()) {
    notificationTime.setDate(notificationTime.getDate() + 1)
  }

  const schedule = { time, timestamp: notificationTime.getTime() }
  await setSchedule(schedule)

  const delay = notificationTime.getTime() - now.getTime()

  console.log(
    `Notification scheduled for ${new Date(
      schedule.timestamp
    ).toString()}. Will show in ~${Math.round(delay / 1000 / 60)} minutes.`
  )

  timeoutId = setTimeout(async () => {
    console.log(`It's time! Showing notification for ${new Date(schedule.timestamp).toString()}.`)
    try {
      await self.registration.showNotification('ラジオ体操の時間です！', {
        body: '今日の体操を記録しましょう',
        icon: '/favicon.ico',
        tag: 'radio-fit-reminder',
      })
      console.log('Notification shown. Rescheduling for the next day.')
      // Reschedule for the next day
      await scheduleNotification(time)
    } catch (err) {
      console.error('Failed to show notification:', err)
    }
  }, delay)
}

async function cancelNotification() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  await clearSchedule()
  console.log('Notification cancelled and schedule cleared from IndexedDB.')
}

async function restoreSchedule() {
  const schedule = await getSchedule()
  if (schedule && schedule.time && schedule.timestamp) {
    const now = new Date().getTime()
    if (schedule.timestamp > now) {
      console.log('Restoring schedule from IndexedDB:', schedule)
      await scheduleNotification(schedule.time)
    } else {
      console.log('Found expired schedule in IndexedDB. Clearing it.')
      await clearSchedule()
    }
  } else {
    console.log('No schedule to restore from IndexedDB.')
  }
}

// --- Service Worker Event Listeners ---

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    scheduleNotification(event.data.time)
  } else if (event.data.type === 'CANCEL_NOTIFICATION') {
    cancelNotification()
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})

self.addEventListener('install', () => {
  self.skipWaiting()
  console.log('Service Worker installing.')
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.')
  // Restore schedule when the service worker activates
  event.waitUntil(clients.claim().then(() => restoreSchedule()))
})
