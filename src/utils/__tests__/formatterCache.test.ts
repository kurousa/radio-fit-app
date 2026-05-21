import { describe, it, expect, beforeEach } from 'vitest'
import { FormatterCache } from '../formatterCache'

describe('FormatterCache', () => {
  beforeEach(() => {
    FormatterCache.clear()
  })

  it('should store and retrieve formatters', () => {
    const formatter = new Intl.DateTimeFormat('en-CA')
    FormatterCache.set('test-key', formatter)

    expect(FormatterCache.has('test-key')).toBe(true)
    expect(FormatterCache.get('test-key')).toBe(formatter)
  })

  it('should return undefined for missing keys', () => {
    expect(FormatterCache.get('missing-key')).toBeUndefined()
    expect(FormatterCache.has('missing-key')).toBe(false)
  })

  it('should clear the cache', () => {
    const formatter = new Intl.DateTimeFormat('en-CA')
    FormatterCache.set('test-key', formatter)
    FormatterCache.clear()

    expect(FormatterCache.has('test-key')).toBe(false)
  })
})
