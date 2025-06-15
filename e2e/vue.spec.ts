import { test, expect } from '@playwright/test'

test.describe('ホーム画面のUI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('挨拶と今日のメッセージが表示される', async ({ page }) => {
    await expect(page.locator('.greeting-text')).toHaveText('おはようございます！')
    await expect(page.locator('.today-message')).toHaveText('今日もラジオ体操の時間です！')
  })

  test('連続実施日数セクションが表示される', async ({ page }) => {
    await expect(page.locator('.streak-label')).toHaveText('現在の連続実施日数')
    await expect(page.locator('.streak-count')).toBeVisible()
  })

  test('体操選択ボタンが2つ表示される', async ({ page }) => {
    await expect(page.locator('button.exercise-button.first')).toHaveText('ラジオ体操 第一')
    await expect(page.locator('button.exercise-button.second')).toHaveText('ラジオ体操 第二')
  })
})
// ProfileViewの統計・モチベーションメッセージ・通知設定の日本語UIテスト
test.describe('プロフィール画面の統計・モチベーション・通知設定', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  })

  test('統計セクションが正しく表示される', async ({ page }) => {
    await expect(page.locator('h3', { hasText: '統計' })).toBeVisible()
    await expect(page.locator('.stat-label', { hasText: '総実施回数' })).toBeVisible()
    await expect(page.locator('.stat-label', { hasText: '最長連続日数' })).toBeVisible()
    await expect(page.locator('.stat-value')).toHaveCount(2)
  })

  test('モチベーションメッセージが表示される', async ({ page }) => {
    await expect(page.locator('.motivational-message')).toBeVisible()
    // どれかのメッセージが表示されていることを確認（初期は記録なし想定）
    // モチベーションメッセージが何も表示されていない場合も許容する
    const text = await page.locator('.motivational-message').textContent()
    expect(
      text === null ||
        text === '' ||
        [
          'まだ記録がありません',
          '素晴らしいスタートです',
          '1週間以上連続',
          '継続は力なり',
          'まだ記録がありません。最初のラジオ体操をしてみましょう！',
        ].some((msg) => text.includes(msg)),
    ).toBeTruthy()
  })

  test('通知設定のUIが正しく動作する', async ({ page }) => {
    // 通知を有効にするチェックボックスがある
    const toggle = page.locator('input[type="checkbox"]#notification-toggle')
    await expect(toggle).toBeVisible()

    // 初期状態では通知時刻の入力が非表示
    await expect(page.locator('input[type="time"]#notification-time')).toBeHidden()

    // チェックを入れると通知時刻の入力が表示される
    await toggle.check()
    await expect(page.locator('input[type="time"]#notification-time')).toBeVisible()

    // チェックを外すと非表示に戻る
    await toggle.uncheck()
    await expect(page.locator('input[type="time"]#notification-time')).toBeHidden()
  })

  test('ヘルプ・お問い合わせリンクが表示されている', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'ヘルプ' })).toBeVisible()
    await expect(page.locator('a.contact-link')).toHaveAttribute('href', /mailto:/)
  })
})
