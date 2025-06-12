<template>
  <div class="home-container">
    <div class="greeting-section">
      <p class="greeting-text">おはようございます！</p>
      <p class="today-message">今日もラジオ体操の時間です！</p>
    </div>

    <div class="streak-section">
      <p class="streak-label">現在の連続実施日数</p>
      <p class="streak-count">{{ currentStreak }}日</p>
    </div>

    <div class="exercise-selection">
      <button @click="goToExercise('first')" class="exercise-button first">ラジオ体操 第一</button>
      <button @click="goToExercise('second')" class="exercise-button second">
        ラジオ体操 第二
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAllRecords, ExerciseRecord } from '../services/recordService'

export default defineComponent({
  name: 'HomeView',
  setup() {
    const router = useRouter()
    const currentStreak = ref(0)

    const calculateStreak = async () => {
      const records = await getAllRecords()
      if (records.length === 0) {
        currentStreak.value = 0
        return
      }

      let streak = 0
      let lastDate: Date | null = null
      const sortedRecords = [...records].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      // 最新の日付から逆順に確認
      for (let i = sortedRecords.length - 1; i >= 0; i--) {
        const recordDate = new Date(sortedRecords[i].date)
        recordDate.setHours(0, 0, 0, 0) // 時刻情報をリセットして日付のみを比較

        if (!lastDate) {
          // 最初のレコードは常に streak にカウント
          streak = 1
          lastDate = recordDate
        } else {
          const diffTime = Math.abs(recordDate.getTime() - lastDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays === 1) {
            // 連続している
            streak++
            lastDate = recordDate
          } else if (diffDays === 0) {
            // 同日内の重複記録はカウントしない
            // 何もしない
          } else {
            // 連続が途切れた
            break
          }
        }
      }
      currentStreak.value = streak
    }

    const goToExercise = (type: 'first' | 'second') => {
      // 必要に応じて、体操の種類をルーティングのパラメータとして渡す
      router.push({ name: 'exercises', query: { type } })
    }

    onMounted(() => {
      calculateStreak()
    })

    return {
      currentStreak,
      goToExercise,
    }
  },
})
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}

.greeting-section {
  margin-bottom: 40px;
}
.greeting-text {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}
.today-message {
  font-size: 20px;
  color: #666;
}

.streak-section {
  background-color: #fff;
  padding: 30px 50px;
  border-radius: 20px;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
  margin-bottom: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.streak-label {
  font-size: 18px;
  color: #777;
  margin-bottom: 10px;
}
.streak-count {
  font-size: 56px;
  font-weight: bold;
  color: #007bff; /* メインカラー */
  line-height: 1;
}

.exercise-selection {
  display: flex;
  gap: 30px;
}

.exercise-button {
  padding: 25px 40px;
  font-size: 22px;
  font-weight: bold;
  color: white;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease-in-out;
  min-width: 220px; /* ボタンの最小幅 */
}

.exercise-button.first {
  background-color: #28a745; /* グリーン系 */
}
.exercise-button.first:hover {
  background-color: #218838;
  transform: translateY(-3px);
}

.exercise-button.second {
  background-color: #ffc107; /* イエロー系 */
  color: #333;
}
.exercise-button.second:hover {
  background-color: #e0a800;
  transform: translateY(-3px);
}
</style>
