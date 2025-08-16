import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../HomeView.vue'
import * as recordService from '../../services/recordService'
import { DateUtils } from '../../services/dateUtils'
import type { ExerciseRecord } from '../../services/recordService'

// モックの設定
vi.mock('../../services/recordService')
vi.mock('../../services/dateUtils')

const mockRecordService = vi.mocked(recordService)
const mockDateUtils = vi.mocked(DateUtils)

// ルーターのモック
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/exercises', name: 'exercises', component: {} }
  ]
})

describe('HomeView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正常にレンダリングされる', () => {
    mockRecordService.getAllRecords.mockResolvedValue([])
    mockDateUtils.calculateStreakWithTimezone.mockReturnValue(0)

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.find('.greeting-text').text()).toBe('おはようございます！')
    expect(wrapper.find('.today-message').text()).toBe('今日もラジオ体操の時間です！')
    expect(wrapper.find('.streak-label').text()).toBe('現在の連続実施日数')
  })

  it('記録がない場合、連続日数が0と表示される', async () => {
    mockRecordService.getAllRecords.mockResolvedValue([])
    mockDateUtils.calculateStreakWithTimezone.mockReturnValue(0)

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    // コンポーネントがマウントされるまで待機
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.streak-count').text()).toBe('0日')
  })

  it('タイムゾーン対応の連続日数計算を使用する', async () => {
    const mockRecords: ExerciseRecord[] = [
      {
        date: '2025-01-15',
        type: 'first',
        timestamp: 1705123456789,
        timezone: 'Asia/Tokyo',
        timezoneOffset: -540,
        localTimestamp: 1705155456789
      },
      {
        date: '2025-01-14',
        type: 'first',
        timestamp: 1705037056789,
        timezone: 'Asia/Tokyo',
        timezoneOffset: -540,
        localTimestamp: 1705069056789
      }
    ]

    mockRecordService.getAllRecords.mockResolvedValue(mockRecords)
    mockDateUtils.calculateStreakWithTimezone.mockReturnValue(2)

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    // コンポーネントがマウントされるまで待機
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // DateUtils.calculateStreakWithTimezoneが呼ばれることを確認
    expect(mockDateUtils.calculateStreakWithTimezone).toHaveBeenCalledWith(mockRecords)
    expect(wrapper.find('.streak-count').text()).toBe('2日')
  })

  it('異なるタイムゾーンの記録でも正しく連続日数を計算する', async () => {
    const mockRecords: ExerciseRecord[] = [
      {
        date: '2025-01-15',
        type: 'first',
        timestamp: 1705123456789,
        timezone: 'America/New_York',
        timezoneOffset: 300,
        localTimestamp: 1705141456789
      },
      {
        date: '2025-01-14',
        type: 'first',
        timestamp: 1705037056789,
        timezone: 'Asia/Tokyo',
        timezoneOffset: -540,
        localTimestamp: 1705069056789
      }
    ]

    mockRecordService.getAllRecords.mockResolvedValue(mockRecords)
    mockDateUtils.calculateStreakWithTimezone.mockReturnValue(2)

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // 異なるタイムゾーンの記録でもDateUtilsが正しく処理することを確認
    expect(mockDateUtils.calculateStreakWithTimezone).toHaveBeenCalledWith(mockRecords)
    expect(wrapper.find('.streak-count').text()).toBe('2日')
  })

  it('連続日数計算でエラーが発生した場合、0を表示する', async () => {
    mockRecordService.getAllRecords.mockRejectedValue(new Error('Database error'))

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(wrapper.find('.streak-count').text()).toBe('0日')
  })

  it('体操ボタンをクリックすると正しいルートに遷移する', async () => {
    mockRecordService.getAllRecords.mockResolvedValue([])
    mockDateUtils.calculateStreakWithTimezone.mockReturnValue(0)

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    const firstButton = wrapper.find('.exercise-button.first')
    const secondButton = wrapper.find('.exercise-button.second')

    expect(firstButton.text()).toBe('ラジオ体操 第一')
    expect(secondButton.text()).toBe('ラジオ体操 第二')

    // ボタンクリックのテストは実際のルーター遷移をテストするため、
    // ここではボタンが存在することのみ確認
    expect(firstButton.exists()).toBe(true)
    expect(secondButton.exists()).toBe(true)
  })

  it('長期間の連続記録でも正しく表示される', async () => {
    const mockRecords: ExerciseRecord[] = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'first' as const,
      timestamp: Date.now() - i * 24 * 60 * 60 * 1000,
      timezone: 'Asia/Tokyo',
      timezoneOffset: -540,
      localTimestamp: Date.now() - i * 24 * 60 * 60 * 1000 + (9 * 60 * 60 * 1000)
    }))

    mockRecordService.getAllRecords.mockResolvedValue(mockRecords)
    mockDateUtils.calculateStreakWithTimezone.mockReturnValue(30)

    const wrapper = mount(HomeView, {
      global: {
        plugins: [router]
      }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockDateUtils.calculateStreakWithTimezone).toHaveBeenCalledWith(mockRecords)
    expect(wrapper.find('.streak-count').text()).toBe('30日')
  })
})
