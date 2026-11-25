import { useEffect, useState } from 'react'
import type { Destination } from '../data/destination'

export function useDestinationSearch(query: string): Destination[] {
  const [results, setResults] = useState<Destination[]>([])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`,
          { signal: controller.signal },
        )
        const data = await response.json() as { results?: Destination[] }
        setResults(data.results ?? [])
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          setResults([])
        }
      }
    }, 300)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  return results
}
