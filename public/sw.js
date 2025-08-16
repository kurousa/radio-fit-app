import { precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST || [])

let timeoutId = null
let scheduledTime = null

function scheduleNotification(time) {
  if (timeoutId) {
    clearTimeout(timeoutId)
    console.log('Cancelled previous notification timer.')
  }

  const now = new Date()
  const [hours, minutes] = time.split(':').map(Number)

  const notificationTime = new Date()
  notificationTime.setHours(hours, minutes, 0, 0)

  if (notificationTime.getTime() <= now.getTime()) {
    console.log('Scheduled time is in the past for today, setting for tomorrow.')
    notificationTime.setDate(notificationTime.getDate() + 1)
  }

  scheduledTime = notificationTime
  const delay = scheduledTime.getTime() - now.getTime()

  console.log(
    `Notification is scheduled for ${scheduledTime.toString()}. It will be shown in approximately ${Math.round(
      delay / 1000 / 60
    )} minutes.`
  )

  timeoutId = setTimeout(() => {
    console.log(`It's time! Attempting to show notification for ${scheduledTime.toString()}.`)
    self.registration
      .showNotification('ラジオ体操の時間です！', {
        body: '今日の体操を記録しましょう',
        icon: '/favicon.ico',
        tag: 'radio-fit-reminder',
      })
      .then(() => {
        console.log('Notification was successfully shown.')
        // Reschedule for the next day
        console.log('Rescheduling notification for the next day.')
        scheduleNotification(time)
      })
      .catch((err) => {
        console.error('Failed to show notification:', err)
      })
  }, delay)
}

function cancelNotification() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
    console.log('Notification cancelled.')
  }
}

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
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

self.addEventListener('install', () => {
  self.skipWaiting()
  console.log('Service Worker installing.')
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.')
  event.waitUntil(self.clients.claim())
})
