import { describe, it, expect, beforeEach, vi } from 'vitest'
import localforage from 'localforage'
import { migrateAllRecordsToTimezoneAware } from '../recordService'

// Mock localforage to simulate storage delay
const mockStore: Record<string, any> = {}
vi.mock('localforage', () => ({
  default: {
    config: vi.fn(),
    getItem: vi.fn(async (key) => mockStore[key]),
    setItem: vi.fn(async (key, value) => {
      // Simulate I/O delay
      await new Promise(resolve => setTimeout(resolve, 10))
      mockStore[key] = value
    }),
    iterate: vi.fn(async (callback) => {
      for (const [key, value] of Object.entries(mockStore)) {
        await callback(value, key, 0)
      }
    }),
  },
}))

describe('migrateAllRecordsToTimezoneAware Benchmark', () => {
  beforeEach(() => {
    // Clear mock store
    for (const key in mockStore) delete mockStore[key]
    vi.clearAllMocks()
  })

  it('should measure migration time for many records', async () => {
    const numDays = 100
    // Populate with records that need migration
    for (let i = 0; i < numDays; i++) {
      const date = new Date(2025, 0, i + 1).toISOString().split('T')[0]
      mockStore[date] = [
        {
          date,
          type: 'first',
          timestamp: Date.now(),
          // No timezone info, so it needs migration
        }
      ]
    }

    const start = performance.now()
    await migrateAllRecordsToTimezoneAware()
    const end = performance.now()

    console.log(`Migration of ${numDays} days took ${end - start}ms`)
  })
})
