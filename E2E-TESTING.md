# E2E Testing Guide

このガイドでは、プロダクションビルドに対してE2Eテストを実行する方法を説明します。

## 前提条件

- Node.js がインストールされていること
- 依存関係がインストールされていること (`pnpminstall`)

## テスト実行方法

### 方法1: 手動でサーバーを起動してテスト実行（推奨）

1. **プロダクションサーバーを起動**

   ```bash
   pnpm start:prod
   ```

   このコマンドは以下を実行します：

   - アプリケーションをビルド (`pnpm build`)
   - プレビューサーバーを起動 (`pnpm preview`)
   - サーバーは http://localhost:4173 で起動します

2. **別のターミナルでE2Eテストを実行**

   ```bash
   pnpm test:e2e-prod
   ```

3. **テスト完了後、サーバーを停止**
   最初のターミナルで `Ctrl+C` を押してサーバーを停止します

### 方法2: 自動でサーバー起動とテスト実行

**Unix/Linux/macOS:**

```bash
pnpm test:e2e-prod-auto
```

**Windows:**

```bash
pnpm test:e2e-prod-auto-win
```

## 設定ファイル

- `playwright.prod.config.ts`: プロダクション環境用のPlaywright設定
- `playwright.config.ts`: 開発環境用のPlaywright設定（デフォルト）

## テスト結果

- テスト結果は `playwright-report-prod/` ディレクトリに保存されます
- スクリーンショットや動画は `test-results-prod/` ディレクトリに保存されます

## 利用可能なスクリプト

| スクリプト                    | 説明                                                       |
| ----------------------------- | ---------------------------------------------------------- |
| `pnpm start:prod`             | プロダクションサーバーを起動                               |
| `pnpm test:e2e-prod`          | プロダクションビルドに対してE2Eテストを実行                |
| `pnpm test:e2e-prod-auto`     | ビルド→サーバー起動→テスト実行を自動化（Unix/Linux/macOS） |
| `pnpm test:e2e-prod-auto-win` | ビルド→サーバー起動→テスト実行を自動化（Windows）          |
| `pnpm test:e2e`               | 開発サーバーに対してE2Eテストを実行（デフォルト）          |

## トラブルシューティング

### ポート4173が既に使用されている場合

```bash
# プロセスを確認
lsof -i :4173  # Unix/Linux/macOS
netstat -ano | findstr :4173  # Windows

# プロセスを終了してから再実行
```

### テストが失敗する場合

1. ブラウザが最新版であることを確認
2. `playwright-report-prod/index.html` でテスト結果を確認
3. `test-results-prod/` でスクリーンショットや動画を確認

### ビルドエラーが発生する場合

```bash
# 依存関係を再インストール
pnpmci

# TypeScriptの型チェック
pnpm type-check
```
