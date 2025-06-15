import localforage from 'localforage'

// IndexedDBのストア名
const STORE_NAME = 'radio_taiso_records'

// localforageインスタンスを初期化
localforage.config({
  name: 'RadioTaisoApp',
  storeName: STORE_NAME,
  description: 'ラジオ体操の実施記録',
})

export interface ExerciseRecord {
  date: string // YYYY-MM-DD
  type: 'first' | 'second' // 体操の種類
  timestamp: number // 記録時のタイムスタンプ
}

/**
 * 体操実施記録を保存する
 * @param date - 実施日付 (YYYY-MM-DD形式)
 * @param type - 体操の種類 ('first' or 'second')
 */
export async function recordExercise(date: string, type: 'first' | 'second'): Promise<void> {
  try {
    const records: ExerciseRecord[] = (await localforage.getItem(date)) || []
    records.push({ date, type, timestamp: Date.now() })
    await localforage.setItem(date, records)
    console.log(`記録しました: ${date} - ${type}`)
  } catch (error) {
    console.error('記録の保存に失敗しました:', error)
    // エラーハンドリング：ユーザーへの通知など
  }
}

/**
 * 全ての実施記録を取得する
 * @returns 全ての記録の配列
 */
export async function getAllRecords(): Promise<ExerciseRecord[]> {
  const allRecords: ExerciseRecord[] = []
  try {
    await localforage.iterate((value) => {
      // keyは日付（YYYY-MM-DD）、valueはその日の記録の配列
      if (Array.isArray(value)) {
        allRecords.push(...value)
      }
    })
    // 日付順にソート (必要であれば)
    allRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return allRecords
  } catch (error) {
    console.error('記録の取得に失敗しました:', error)
    return []
  }
}

/**
 * 特定の日の記録を取得する
 * @param date - 取得したい日付 (YYYY-MM-DD形式)
 * @returns その日の記録の配列
 */
export async function getRecordsByDate(date: string): Promise<ExerciseRecord[]> {
  try {
    const records: ExerciseRecord[] = (await localforage.getItem(date)) || []
    return records
  } catch (error) {
    console.error(`日付 ${date} の記録取得に失敗しました:`, error)
    return []
  }
}
