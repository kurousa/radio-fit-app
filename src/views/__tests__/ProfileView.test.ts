import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileView from '../ProfileView.vue'
import * as recordService from '../../services/recordService'
import { TimezoneService } from '../../services/timezoneService'
import { DateUtils } from '../../services/dateUtils'

// Mock the services
vi.mock('../../services/recordService')
vi.mock('../../services/timezoneService')
vi.mock('../../services/dateUtils')

describe('ProfileView Timezone Features', () => {
  const mockRecords = [
    {
      date: '2025-08-16',
      type: 'first' as const,
      timestamp: 1723804800000, // 2025-08-16 12:00:00 UTC
      timezone: 'Asia/Tokyo',
      timezoneOffset: -540,
      localTimestamp: 1723837200000 // 2025-08-16 21:00:00 JST
    },
    {
      date: '2025-08-15',
      type: 'second' as const,
      timestamp: 1723718400000, // 2025-08-15 12:00:00 UTC
      timezone: 'Asia/Tokyo',
      timezoneOffset: -540,
      localTimestamp: 1723750800000 // 2025-08-15 21:00:00 JST
    }
  ]

  const mockTimezoneInfo = {
    timezone: 'Asia/Tokyo',
    offset: -540,
    localTime: new Date('2025-08-16T21:00:00+09:00'),
    utcTime: new Date('2025-08-16T12:00:00Z')
  }

  const mockCalendarDates = [
    {
      date: new Date('2025-08-16T12:00:00'),
      records: [mockRecords[0]],
      localDateString: '2025-08-16'
    },
    {
      date: new Date('2025-08-15T12:00:00'),
      records: [mockRecords[1]],
      localDateString: '2025-08-15'
    }
  ]

  beforeEach(() => {
    // Mock recordService
    vi.mocked(recordService.getRecordsWithTimezoneConversion).mockResolvedValue(mockRecords)

    // Mock TimezoneService
    vi.mocked(TimezoneService.getCurrentTimezoneInfo).mockReturnValue(mockTimezoneInfo)
    vi.mocked(TimezoneService.convertUTCToLocal).mockImplementation((timestamp) => new Date(timestamp))

    // Mock DateUtils
    vi.mocked(DateUtils.calculateStreakWithTimezone).mockReturnValue(2)
    vi.mocked(DateUtils.convertRecordsForCalendar).mockReturnValue(mockCalendarDates)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should load records with timezone conversion', async () => {
    const wrapper = mount(ProfileView)

    // Wait for component to mount and load records
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(recordService.getRecordsWithTimezoneConversion).toHaveBeenCalled()
  })

  it('should use timezone-aware streak calculation', async () => {
    const wrapper = mount(ProfileView)

    // Wait for component to mount and load records
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    // Check that the longest streak uses timezone-aware calculation
    expect(DateUtils.calculateStreakWithTimezone).toHaveBeenCalledWith(mockRecords)
  })

  it('should generate timezone-aware calendar attributes', async () => {
    const wrapper = mount(ProfileView)

    // Wait for component to mount and load records
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(DateUtils.convertRecordsForCalendar).toHaveBeenCalledWith(
      mockRecords,
      'Asia/Tokyo'
    )
  })

  it('should detect current timezone on mount', async () => {
    mount(ProfileView)

    expect(TimezoneService.getCurrentTimezoneInfo).toHaveBeenCalled()
  })

  it('should display total exercises count', async () => {
    const wrapper = mount(ProfileView)

    // Wait for component to mount and load records
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const totalExercises = wrapper.find('.stat-value')
    expect(totalExercises.text()).toBe('2回')
  })

  it('should display timezone-aware longest streak', async () => {
    const wrapper = mount(ProfileView)

    // Wait for component to mount and load records
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    const statValues = wrapper.findAll('.stat-value')
    expect(statValues[1].text()).toBe('2日') // longest streak
  })

  it('should handle timezone service errors gracefully', async () => {
    // Mock timezone service to throw error
    vi.mocked(TimezoneService.getCurrentTimezoneInfo).mockImplementation(() => {
      throw new Error('Timezone detection failed')
    })

    // Should not throw error during mount
    expect(() => {
      mount(ProfileView)
    }).not.toThrow()
  })

  it('should fallback to getAllRecords when timezone conversion fails', async () => {
    // Mock timezone conversion to fail
    vi.mocked(recordService.getRecordsWithTimezoneConversion).mockRejectedValue(
      new Error('Timezone conversion failed')
    )
    vi.mocked(recordService.getAllRecords).mockResolvedValue(mockRecords)

    const wrapper = mount(ProfileView)

    // Wait for component to mount and load records
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(recordService.getAllRecords).toHaveBeenCalled()
  })
})
