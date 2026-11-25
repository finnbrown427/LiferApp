import { importLifeListCsv as parseLifeListCsv } from '../data/ebird'

export function importLifeList(csvText: string): Set<string> {
  return parseLifeListCsv(csvText)
}
