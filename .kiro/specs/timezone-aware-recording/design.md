# 設計書

## 概要

RadioFitアプリにおけるタイムゾーン対応機能の設計書です。現在、記録がUTCで保存されているため、ユーザーのローカルタイムゾーンでの正確な表示ができていない問題を解決します。Vue 3 + TypeScript + V-Calendar + LocalForageの技術スタックを活用し、タイムゾーン情報を適切に処理する機能を実装します。

## アーキテクチャ

### 全体構成

```
Frontend (Vue 3 + TypeScript)
├── Services Layer
│   ├── recordService.ts (既存) - 記録の保存・取得
│   ├── timezoneService.ts (新規) - タイムゾーン処理
│   └── dateUtils.ts (新規) - 日付ユーティリティ
├── Components Layer
│   ├── ProfileView.vue (既存) - カレンダー表示
│   ├── ExercisesView.vue (既存) - 記録作成
│   └── HomeView.vue (既存) - 連続日数計算
└── Storage Layer
    └── LocalForage (IndexedDB) - ローカルストレージ
```

### データフロー

1. **記録作成時**: ユーザーがExercisesViewで体操完了 → タイムゾーン情報付きで保存
2. **表示時**: ProfileViewでカレンダー表示 → ユーザーの現在タイムゾーンに変換して表示
3. **連続日数計算**: HomeViewで計算 → タイムゾーンを考慮した日付比較

## コンポーネントと インターフェース

### 1. データモデル拡張

既存の`ExerciseRecord`インターフェースを拡張:

```typescript
export interface ExerciseRecord {
  date: string // YYYY-MM-DD (ローカル日付)
  type: 'first' | 'second'
  timestamp: number // UTC タイムスタンプ
  timezone: string // タイムゾーン識別子 (例: "Asia/Tokyo")
  timezoneOffset: number // タイムゾーンオフセット (分単位)
  localTimestamp: number // ローカルタイムスタンプ
}
```

### 2. TimezoneService

タイムゾーン処理を担当する新しいサービス:

```typescript
export interface TimezoneInfo {
  timezone: string
  offset: number
  localTime: Date
  utcTime: Date
}

export class TimezoneService {
  // ユーザーの現在タイムゾーン情報を取得
  getCurrentTimezoneInfo(): TimezoneInfo
  
  // UTCタイムスタンプをローカル時刻に変換
  convertUTCToLocal(utcTimestamp: number, targetTimezone?: string): Date
  
  // ローカル時刻をUTCに変換
  convertLocalToUTC(localDate: Date, timezone: string): number
  
  // 日付文字列をタイムゾーン考慮で生成
  formatLocalDate(date: Date, timezone: string): string
}
```

### 3. DateUtils

日付処理のユーティリティ関数:

```typescript
export class DateUtils {
  // タイムゾーンを考慮した日付比較
  static isSameLocalDate(date1: Date, date2: Date, timezone: string): boolean
  
  // 連続日数計算（タイムゾーン対応）
  static calculateStreakWithTimezone(records: ExerciseRecord[]): number
  
  // カレンダー表示用の日付変換
  static convertRecordsForCalendar(records: ExerciseRecord[], displayTimezone: string): CalendarDate[]
}
```

### 4. RecordService拡張

既存のrecordServiceにタイムゾーン対応を追加:

```typescript
// 新しいメソッド
export async function recordExerciseWithTimezone(
  type: 'first' | 'second',
  customDate?: Date
): Promise<void>

export async function getRecordsWithTimezoneConversion(
  targetTimezone?: string
): Promise<ExerciseRecord[]>
```

## データモデル

### 記録データ構造

```typescript
// 保存される記録の例
{
  date: "2025-01-15", // ローカル日付
  type: "first",
  timestamp: 1705123456789, // UTC タイムスタンプ
  timezone: "Asia/Tokyo", // IANA タイムゾーン識別子
  timezoneOffset: -540, // JST は UTC+9時間 = -540分
  localTimestamp: 1705155856789 // ローカルタイムスタンプ (timestamp + 32400000)
}
```

### カレンダー表示データ

```typescript
// V-Calendar用の属性データ
{
  key: "recorded-2025-01-15",
  dates: new Date(2025, 0, 15), // ユーザーの現在タイムゾーンでの日付
  highlight: {
    color: 'green',
    fillMode: 'solid'
  },
  popover: {
    label: 'ラジオ体操実施済み (09:30 JST)'
  }
}
```

## エラーハンドリング

### タイムゾーン検出失敗時の対応

1. **ブラウザAPIが利用できない場合**
   - `Intl.DateTimeFormat().resolvedOptions().timeZone`が失敗
   - フォールバック: UTC使用 + ユーザー通知

2. **無効なタイムゾーンデータ**
   - 保存されたタイムゾーン情報が無効
   - フォールバック: UTCで再計算 + データ修復

3. **サマータイム切り替え時**
   - 時刻の重複や欠落への対応
   - UTCベースでの一貫した処理

### エラー通知システム

```typescript
export interface TimezoneError {
  type: 'detection_failed' | 'invalid_timezone' | 'conversion_error'
  message: string
  fallbackAction: string
}

export class TimezoneErrorHandler {
  static handleError(error: TimezoneError): void
  static showUserNotification(message: string): void
}
```

## テスト戦略

### 単体テスト

1. **TimezoneService**
   - 各タイムゾーンでの変換精度
   - サマータイム切り替え時の動作
   - エラーケースの処理

2. **DateUtils**
   - 異なるタイムゾーン間での日付比較
   - 連続日数計算の正確性
   - 境界値テスト（日付変更線付近）

3. **RecordService**
   - タイムゾーン情報付き保存・取得
   - 既存データとの互換性
   - データマイグレーション

### 統合テスト

1. **カレンダー表示**
   - 異なるタイムゾーンでの記録表示
   - タイムゾーン変更時の自動更新
   - V-Calendarとの連携

2. **記録作成フロー**
   - ExercisesView → RecordService → ProfileView
   - タイムゾーン情報の一貫性
   - リアルタイム更新

### E2Eテスト

1. **ユーザーシナリオ**
   - 異なるタイムゾーンでの記録作成・表示
   - システムタイムゾーン変更時の動作
   - 旅行時の記録継続性

## 実装上の考慮事項

### パフォーマンス

1. **タイムゾーン変換の最適化**
   - 変換結果のキャッシュ
   - 必要時のみ変換実行
   - バッチ処理での効率化

2. **ストレージ効率**
   - 冗長なタイムゾーン情報の削減
   - インデックス最適化
   - データ圧縮

### 互換性

1. **既存データの移行**
   - 既存記録へのタイムゾーン情報追加
   - 段階的移行戦略
   - データ整合性の保証

2. **ブラウザ対応**
   - Intl APIの対応状況確認
   - ポリフィルの検討
   - 代替実装の準備

### セキュリティ

1. **タイムゾーン情報の取り扱い**
   - 位置情報プライバシーの考慮
   - ローカルストレージでの安全な保存
   - 不正なタイムゾーン値の検証

## 技術的詳細

### 使用ライブラリ

- **既存**: Vue 3, TypeScript, V-Calendar, LocalForage
- **新規検討**: なし（ブラウザ標準APIを活用）

### ブラウザAPI活用

```typescript
// タイムゾーン検出
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

// タイムゾーン変換
const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
```

### V-Calendar統合

```typescript
// タイムゾーン対応のカレンダー属性生成
const generateCalendarAttributes = (
  records: ExerciseRecord[],
  displayTimezone: string
) => {
  return records.map(record => ({
    dates: convertToDisplayTimezone(record, displayTimezone),
    highlight: { color: 'green' },
    popover: {
      label: `${formatLocalTime(record)} に実施`
    }
  }))
}
```