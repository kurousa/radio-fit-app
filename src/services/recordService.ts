import localforage from 'localforage'
import { TimezoneService } from './timezoneService'

// IndexedDBのストア名
const STORE_NAME = 'radio_taiso_records'

// localforageインスタンスを初期化
localforage.config({
  name: 'RadioTaisoApp',
  storeName: STORE_NAME,
  description: 'ラジオ体操の実施記録',
})

export interface ExerciseRecord {
  date: string // YYYY-MM-DD (ローカル日付)
  type: 'first' | 'second' // 体操の種類
  timestamp: number // UTC タイムスタンプ
  timezone?: string // タイムゾーン識別子 (例: "Asia/Tokyo")
  timezoneOffset?: number // タイムゾーンオフセット (分単位)
  localTimestamp?: number // ローカルタイムスタンプ
}

/**
 * 体操実施記録を保存する（後方互換性のため維持）
 * 内部的にタイムゾーン対応版を使用
 * @param date - 実施日付 (YYYY-MM-DD形式)
 * @param type - 体操の種類 ('first' or 'second')
 */
export async function recordExercise(date: string, type: 'first' | 'second'): Promise<void> {
  try {
    // 指定された日付でDateオブジェクトを作成
    // YYYY-MM-DD形式の文字列から日付を作成（ローカル時刻として解釈）
    const [year, month, day] = date.split('-').map(Number)
    const customDate = new Date(year, month - 1, day)

    // タイムゾーン対応版を内部的に使用
    await recordExerciseWithTimezone(type, customDate)

    console.log(`記録しました: ${date} - ${type}`)
  } catch (error) {
    console.error('記録の保存に失敗しました:', error)
    // エラーハンドリング：ユーザーへの通知など
    throw error
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

/**
 * タイムゾーン情報付きで体操実施記録を保存する
 * @param type - 体操の種類 ('first' or 'second')
 * @param customDate - カスタム日付（省略時は現在日時）
 */
export async function recordExerciseWithTimezone(
  type: 'first' | 'second',
  customDate?: Date
): Promise<void> {
  try {
    // 現在のタイムゾーン情報を取得
    const timezoneInfo = TimezoneService.getCurrentTimezoneInfo()
    const recordDate = customDate || new Date()

    // UTCタイムスタンプ
    const utcTimestamp = recordDate.getTime()

    // ローカル日付文字列を生成
    const localDateString = TimezoneService.formatLocalDate(recordDate, timezoneInfo.timezone)

    // ローカルタイムスタンプを計算
    const localTimestamp = recordDate.getTime() + (timezoneInfo.offset * 60 * 1000)

    // タイムゾーン対応の記録データを作成
    const record: ExerciseRecord = {
      date: localDateString,
      type,
      timestamp: utcTimestamp,
      timezone: timezoneInfo.timezone,
      timezoneOffset: timezoneInfo.offset,
      localTimestamp
    }

    // 既存の記録を取得
    const existingRecords: ExerciseRecord[] = (await localforage.getItem(localDateString)) || []

    // 新しい記録を追加
    existingRecords.push(record)

    // 保存
    await localforage.setItem(localDateString, existingRecords)

    console.log(`タイムゾーン対応記録を保存しました: ${localDateString} - ${type} (${timezoneInfo.timezone})`)
  } catch (error) {
    console.error('タイムゾーン対応記録の保存に失敗しました:', error)
    throw new Error('Failed to record exercise with timezone information')
  }
}

/**
 * 指定タイムゾーンに変換して記録を取得する
 * @param targetTimezone - 変換先タイムゾーン（省略時は現在のタイムゾーン）
 * @returns タイムゾーン変換された記録の配列
 */
export async function getRecordsWithTimezoneConversion(
  targetTimezone?: string
): Promise<ExerciseRecord[]> {
  try {
    // 全ての記録を取得
    const allRecords = await getAllRecords()

    // 既存データの自動マイグレーション
    const migratedRecords = migrateRecordsToTimezoneAware(allRecords)

    // ターゲットタイムゾーンを決定
    const timezone = targetTimezone || TimezoneService.getCurrentTimezoneInfo().timezone

    // 各記録をターゲットタイムゾーンに変換
    const convertedRecords = migratedRecords.map(record => {
      try {
        // 既にターゲットタイムゾーンの場合はそのまま返す
        if (record.timezone === timezone) {
          return record
        }

        // UTCタイムスタンプからターゲットタイムゾーンの時刻に変換
        const localDate = TimezoneService.convertUTCToLocal(record.timestamp, timezone)
        const localDateString = TimezoneService.formatLocalDate(localDate, timezone)

        // タイムゾーン情報を更新
        const timezoneInfo = TimezoneService.getCurrentTimezoneInfo()

        return {
          ...record,
          date: localDateString,
          timezone: timezone,
          timezoneOffset: timezoneInfo.offset,
          localTimestamp: localDate.getTime()
        }
      } catch (error) {
        console.error(`記録の変換に失敗しました (ID: ${record.date}-${record.type}):`, error)
        // エラー時は元の記録を返す
        return record
      }
    })

    // 日付順にソート
    convertedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return convertedRecords
  } catch (error) {
    console.error('タイムゾーン変換記録の取得に失敗しました:', error)
    return []
  }
}
/**
 * 既存データとの互換性を保つためのマイグレーション関数
 */

/**
 * 既存の記録データにタイムゾーン情報を追加する
 * @param record - 既存の記録データ
 * @param timezone - 適用するタイムゾーン（省略時は現在のタイムゾーン）
 * @returns タイムゾーン情報が追加された記録データ
 */
export function migrateRecordToTimezoneAware(
  record: ExerciseRecord,
  timezone?: string
): ExerciseRecord {
  // 既にタイムゾーン情報がある場合はそのまま返す
  if (record.timezone && record.timezoneOffset !== undefined && record.localTimestamp) {
    return record
  }

  try {
    // タイムゾーン情報を取得（省略時は現在のタイムゾーンを使用）
    const targetTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    // タイムゾーンの有効性をチェック
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: targetTimezone })
    } catch (timezoneError) {
      console.error(`Invalid timezone: ${targetTimezone}`, timezoneError)
      return record // 無効なタイムゾーンの場合は元の記録を返す
    }

    // 既存のタイムスタンプからタイムゾーン情報を計算
    const utcDate = new Date(record.timestamp)

    // タイムゾーンオフセットを計算
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: targetTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    const parts = formatter.formatToParts(utcDate)
    const partsObj = parts.reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {} as Record<string, string>)

    const localDate = new Date(
      parseInt(partsObj.year),
      parseInt(partsObj.month) - 1,
      parseInt(partsObj.day),
      parseInt(partsObj.hour),
      parseInt(partsObj.minute),
      parseInt(partsObj.second)
    )

    const timezoneOffset = Math.round((localDate.getTime() - utcDate.getTime()) / (1000 * 60))

    return {
      ...record,
      timezone: targetTimezone,
      timezoneOffset,
      localTimestamp: localDate.getTime()
    }
  } catch (error) {
    console.error('Failed to migrate record to timezone-aware:', error)
    // エラー時は元の記録をそのまま返す
    return record
  }
}

/**
 * 複数の記録データを一括でマイグレーションする
 * @param records - 既存の記録データ配列
 * @param timezone - 適用するタイムゾーン（省略時は現在のタイムゾーン）
 * @returns タイムゾーン情報が追加された記録データ配列
 */
export function migrateRecordsToTimezoneAware(
  records: ExerciseRecord[],
  timezone?: string
): ExerciseRecord[] {
  return records.map(record => migrateRecordToTimezoneAware(record, timezone))
}

/**
 * 記録データがタイムゾーン対応済みかどうかを判定する
 * @param record - 判定する記録データ
 * @returns タイムゾーン対応済みの場合true
 */
export function isTimezoneAwareRecord(record: ExerciseRecord): boolean {
  return !!(record.timezone &&
           record.timezoneOffset !== undefined &&
           record.localTimestamp)
}

/**
 * 全ての記録データを自動的にマイグレーションする
 * 既存データとの互換性を保ちながら、タイムゾーン情報を追加
 */
export async function migrateAllRecordsToTimezoneAware(): Promise<void> {
  try {
    console.log('Starting automatic migration of existing records...')

    const allRecords = await getAllRecords()
    let migratedCount = 0

    // 日付ごとにグループ化された記録を処理
    const recordsByDate: Record<string, ExerciseRecord[]> = {}

    // 既存の記録を日付でグループ化
    for (const record of allRecords) {
      if (!recordsByDate[record.date]) {
        recordsByDate[record.date] = []
      }
      recordsByDate[record.date].push(record)
    }

    // 各日付の記録をマイグレーション
    for (const [date, records] of Object.entries(recordsByDate)) {
      const migratedRecords = migrateRecordsToTimezoneAware(records)

      // マイグレーションが必要だった記録があるかチェック
      const needsMigration = records.some((record, index) =>
        !isTimezoneAwareRecord(record) && isTimezoneAwareRecord(migratedRecords[index])
      )

      if (needsMigration) {
        await localforage.setItem(date, migratedRecords)
        migratedCount += migratedRecords.length
      }
    }

    console.log(`Migration completed. ${migratedCount} records were migrated.`)
  } catch (error) {
    console.error('Failed to migrate existing records:', error)
    throw new Error('Record migration failed')
  }
}
