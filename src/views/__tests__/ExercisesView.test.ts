import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ExercisesView from '../ExercisesView.vue'

// Mock the recordService
vi.mock('../../services/recordService', () => ({
  recordExerciseWithTimezone: vi.fn().mockResolvedValue(undefined)
}))

// Mock the timezoneService
vi.mock('../../services/timezoneService', () => ({
  TimezoneErrorHandler: {
    showUserNotification: vi.fn()
  }
}))

// Mock the YouTubePlayer component
vi.mock('../../components/YoutubePlayer.vue', () => ({
  default: {
    name: 'YouTubePlayer',
    template: '<div class="youtube-player-mock">YouTube Player Mock</div>',
    props: ['video-id']
  }
}))

describe('ExercisesView', () => {
  let router: unknown

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/exercises', component: ExercisesView }
      ]
    })
  })

  it('should render correctly', async () => {
    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    expect(wrapper.find('.exercises-container').exists()).toBe(true)
    expect(wrapper.find('.video-selection-buttons').exists()).toBe(true)
    expect(wrapper.find('.complete-button').exists()).toBe(true)
  })

  it('should have exercise selection buttons', async () => {
    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    const buttons = wrapper.findAll('.video-selection-buttons button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toBe('ラジオ体操 第一')
    expect(buttons[1].text()).toBe('ラジオ体操 第二')
  })

  it('should have complete exercise button', async () => {
    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    const completeButton = wrapper.find('.complete-button')
    expect(completeButton.exists()).toBe(true)
    expect(completeButton.text()).toBe('Exercise Completed')
  })

  it('should call recordExerciseWithTimezone when complete button is clicked', async () => {
    const { recordExerciseWithTimezone } = await import('../../services/recordService')

    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    const completeButton = wrapper.find('.complete-button')
    await completeButton.trigger('click')

    expect(recordExerciseWithTimezone).toHaveBeenCalledWith('first')
  })

  it('should show completion popup after successful recording', async () => {
    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    const completeButton = wrapper.find('.complete-button')
    await completeButton.trigger('click')

    // Wait for the async operation to complete
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.completion-popup').exists()).toBe(true)
    expect(wrapper.find('.completion-popup').text()).toContain('お疲れ様でした！')
  })

  it('should show error popup when recording fails', async () => {
    // Mock recordExerciseWithTimezone to throw an error
    const { recordExerciseWithTimezone } = await import('../../services/recordService')
    vi.mocked(recordExerciseWithTimezone).mockRejectedValueOnce(new Error('Recording failed'))

    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    const completeButton = wrapper.find('.complete-button')
    await completeButton.trigger('click')

    // Wait for the async operation to complete
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-popup').exists()).toBe(true)
    expect(wrapper.find('.error-popup').text()).toContain('エラーが発生しました')
    expect(wrapper.find('.error-popup').text()).toContain('記録の保存に失敗しました')
  })

  it('should call TimezoneErrorHandler when recording fails', async () => {
    const { TimezoneErrorHandler } = await import('../../services/timezoneService')
    const { recordExerciseWithTimezone } = await import('../../services/recordService')

    // Mock recordExerciseWithTimezone to throw an error
    vi.mocked(recordExerciseWithTimezone).mockRejectedValueOnce(new Error('Recording failed'))

    const wrapper = mount(ExercisesView, {
      global: {
        plugins: [router]
      }
    })

    const completeButton = wrapper.find('.complete-button')
    await completeButton.trigger('click')

    // Wait for the async operation to complete
    await wrapper.vm.$nextTick()

    expect(TimezoneErrorHandler.showUserNotification).toHaveBeenCalledWith(
      expect.stringContaining('記録保存エラー')
    )
  })
})
