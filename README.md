# RadioFit アプリ

## 概要

RadioFitは、ラジオ体操を支援するアプリケーションです。

ユーザーは、ラジオ体操の動画を見ながら、運動の記録をつけ、
日々の健康管理に役立てることができます。

## 主な機能

- ラジオ体操動画の再生
- 運動記録の保存
  - 実績をカレンダー表示できます
  - 連続実施記録をつけることができます
- (WIP)決まったスケジュールでのリマインダー通知

## 技術スタック

- Vue3(SPA)
- TypeScript
- ServiceWorker
- IndexedDB

## 開発環境の構築

1. Node.jsとnpm (または yarn) をインストールします。
2. リポジトリをクローンします。

   ```bash
   git clone <リポジトリのURL>
   ```

3. プロジェクトのディレクトリに移動します。

   ```bash
   cd radio-fit-app
   ```

4. 依存関係をインストールします。

   ```bash
   npm install
   # または
   yarn install
   ```

## 実行方法

1. 開発サーバーを起動します。

   ```bash
   npm run dev
   # または
   yarn dev
   ```

2. ブラウザで `http://localhost:5173` にアクセスします。

## ビルド方法

```bash
npm run build
# または
yarn build
```

## テスト

### 単体テスト

```bash
npm run test:unit
# または
yarn test:unit
```

### E2Eテスト

#### 開発環境でのE2Eテスト

```bash
npm run test:e2e
# または
yarn test:e2e
```

#### プロダクションビルドでのE2Eテスト

```bash
# 1. プロダクションサーバーを起動
npm run start:prod

# 2. 別のターミナルでE2Eテストを実行
npm run test:e2e-prod
```

詳細な手順については [E2E-TESTING.md](./E2E-TESTING.md) を参照してください。

## 貢献方法

1. Issueを作成し、提案やバグ報告を行います。
2. Pull Requestを送信する際は、以下の点に注意してください。
   - コードスタイルに従ってください。
   - テストを追加してください。
   - コミットメッセージを明確に記述してください。

## ライセンス

[LICENCE](./LICENCE.md)
