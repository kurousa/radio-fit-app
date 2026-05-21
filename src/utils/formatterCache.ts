/**
 * Intl.DateTimeFormat caching utility
 * Reduces the overhead of instantiating Intl.DateTimeFormat objects.
 */

const cache = new Map<string, Intl.DateTimeFormat>()

export const FormatterCache = {
  get(key: string): Intl.DateTimeFormat | undefined {
    return cache.get(key)
  },

  set(key: string, formatter: Intl.DateTimeFormat): void {
    cache.set(key, formatter)
  },

  has(key: string): boolean {
    return cache.has(key)
  },

  clear(): void {
    cache.clear()
  }
}
