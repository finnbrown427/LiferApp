import { importLifeListEntriesCsv } from '../data/ebird'
import type { LifeListEntry } from '../data/lifeList'

export function importLifeList(csvText: string): LifeListEntry[] {
  return importLifeListEntriesCsv(csvText)
}
