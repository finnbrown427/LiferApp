import { useState, useEffect } from "react";

// Gets Open-Meteo geocoding API destination matches based on user input.
export function useDestinationSearch(query: string): Destination[] {
  const [results, setResults] = useState<Destination[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) return setResults([]);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5`,
          { signal: ctrl.signal }
        );
        const data = await res.json() as { results?: Destination[] };
        setResults(data.results ?? []);
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          setResults([])
        }
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);
  return results;
}

export type Destination = {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
}

