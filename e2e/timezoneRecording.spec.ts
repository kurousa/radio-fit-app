/**
 * タイムゾーン対応記録機能のE2Eテスト
 * 実際のブラウザ環境でのUI動作をテスト
 */

import { test, expect } from '@playwright/test'

test.describe('Timezone Recording E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Basic UI Tests', () => {
    test('should display home page correctly', async ({ page }) => {
      // ホーム画面の基本要素が表示されることを確認
      await expect(page.locator('.greeting-text')).toBeVisible()
      await expect(page.locator('.today-message')).toBeVisible()
      await expect(page.locator('.streak-count')).toBeVisible()
      await expect(page.locator('.exercise-button.first')).toBeVisible()
      await expect(page.locator('.exercise-button.second')).toBeVisible()
    })

    test('should navigate to exercises page', async ({ page }) => {
      // エクササイズページに移動
      await page.click('.exercise-button.first')

      // エクササイズページの要素が表示されることを確認
      await expect(page.locator('.complete-button')).toBeVisible()
      await expect(page.locator('.video-selection-buttons')).toBeVisible()
    })

    test('should navigate to profile page', async ({ page }) => {
      // プロフィール画面に移動
      await page.click('a[href="/profile"]')
      await page.waitForLoadState('domcontentloaded')

      // プロフィール画面の要素が表示されることを確認
      await expect(page.locator('.page-title')).toBeVisible()
      await expect(page.locator('.custom-calendar').first()).toBeVisible()
      await expect(page.locator('.stats-section')).toBeVisible()
    })
  })

  test.describe('Timezone Functionality', () => {
    test('should detect browser timezone correctly', async ({ page }) => {
      // ブラウザのタイムゾーン情報を取得
      const browserTimezone = await page.evaluate(() => {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
      })

      // タイムゾーンが正しく検出されることを確認
      expect(browserTimezone).toBeTruthy()
      expect(typeof browserTimezone).toBe('string')
    })

    test('should handle date formatting correctly', async ({ page }) => {
      // 日付フォーマットのテスト
      const dateFormats = await page.evaluate(() => {
        const testDate = new Date('2025-01-15T12:00:00Z')

        return {
          local: testDate.toLocaleDateString(),
          iso: testDate.toISOString().split('T')[0],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })

      expect(dateFormats.local).toBeTruthy()
      expect(dateFormats.iso).toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(dateFormats.timezone).toBeTruthy()
    })
  })

  test.describe('Exercise Recording', () => {
    test('should complete exercise and show popup', async ({ page }) => {
      // エクササイズページに移動
      await page.goto('/exercises')

      // 完了ボタンをクリック
      await page.click('.complete-button')

      // 完了ポップアップが表示されることを確認
      await expect(page.locator('.completion-popup')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Error Handling', () => {
    test('should handle invalid timezone gracefully', async ({ page }) => {
      // 無効なタイムゾーンでのエラーハンドリングをテスト
      const errorHandling = await page.evaluate(() => {
        try {
          // 無効なタイムゾーンを使用
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Invalid/Timezone'
          }).format(new Date())
          return { success: true, error: null }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      // エラーが適切にキャッチされることを確認
      expect(errorHandling.success).toBe(false)
      expect(errorHandling.error).toBeTruthy()
    })
  })

  test.describe('Performance', () => {
    test('should load pages within reasonable time', async ({ page }) => {
      // ページ読み込み時間を測定
      const startTime = Date.now()

      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      const homeLoadTime = Date.now() - startTime

      // プロフィール画面の読み込み時間も測定
      const profileStartTime = Date.now()

      await page.click('a[href="/profile"]')
      await page.waitForLoadState('domcontentloaded')

      const profileLoadTime = Date.now() - profileStartTime

      // 読み込み時間が合理的な範囲内であることを確認
      expect(homeLoadTime).toBeLessThan(5000) // 5秒以内
      expect(profileLoadTime).toBeLessThan(5000) // 5秒以内
    })
  })

  test.describe('Browser Compatibility', () => {
    test('should support Intl API', async ({ page }) => {
      // Intl APIのサポート状況を確認
      const intlSupport = await page.evaluate(() => {
        return {
          DateTimeFormat: typeof Intl.DateTimeFormat !== 'undefined',
          supportedLocales: Intl.DateTimeFormat.supportedLocalesOf(['ja-JP', 'en-US']),
          resolvedOptions: typeof Intl.DateTimeFormat().resolvedOptions === 'function'
        }
      })

      expect(intlSupport.DateTimeFormat).toBe(true)
      expect(intlSupport.supportedLocales.length).toBeGreaterThan(0)
      expect(intlSupport.resolvedOptions).toBe(true)
    })

    test('should handle localStorage availability', async ({ page }) => {
      // LocalStorageの利用可能性をテスト
      const storageTest = await page.evaluate(() => {
        try {
          const testKey = 'timezone-test'
          const testValue = 'test-value'

          localStorage.setItem(testKey, testValue)
          const retrieved = localStorage.getItem(testKey)
          localStorage.removeItem(testKey)

          return {
            available: true,
            working: retrieved === testValue
          }
        } catch (error) {
          return {
            available: false,
            working: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      // LocalStorageが利用可能であることを確認
      expect(storageTest.available).toBe(true)
      expect(storageTest.working).toBe(true)
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // モバイルビューポートに設定
      await page.setViewportSize({ width: 375, height: 667 })

      // 要素が適切に表示されることを確認
      await expect(page.locator('.exercise-button.first')).toBeVisible()
      await expect(page.locator('.exercise-button.second')).toBeVisible()
      await expect(page.locator('.streak-count')).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      // タブレットビューポートに設定
      await page.setViewportSize({ width: 768, height: 1024 })

      // レイアウトが適切に調整されることを確認
      await expect(page.locator('.greeting-text')).toBeVisible()
      await expect(page.locator('.today-message')).toBeVisible()
    })
  })
})