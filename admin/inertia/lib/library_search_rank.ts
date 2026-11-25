export type RankedTitle = {
  value: string
  source: string
}

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

function sourcePriority(source: string): number {
  const name = source.toLocaleLowerCase()
  if (name.includes('medlineplus') || name.includes('wikipedia_en_medicine')) return 0
  if (name.includes('nhs.uk') || name.includes('ready.gov') || name.includes('cdc.gov')) return 1
  if (name.includes('ifixit')) return 2
  if (name.includes('wikipedia_en_all_mini')) return 3
  if (name.includes('wikibooks') || name.includes('gardenology')) return 4
  if (name.includes('wikipedia_en_top')) return 6
  if (name.includes('stackexchange.com')) return 8
  return 5
}

const MEDICAL_INTENT =
  /\b(cpr|chok(?:e|ing)|bleed(?:ing)?|burns?|fractures?|splints?|shock|wounds?|first aid|poison(?:ing)?)\b/i
const CIVIL_EMERGENCY_INTENT =
  /\b(power outages?|emergency heat|water(?: purification)?|earthquakes?|wildfires?|floods?|tornado(?:es)?|winter storms?|extreme (?:heat|cold))\b/i

/**
 * Prefer an emergency authority when the query has clear safety intent. The bonus is
 * deliberately smaller than two title-relevance tiers, so it can promote a trusted
 * title prefix over an ambiguous exact encyclopedia title without making a loosely
 * related authority result beat a strong literal match.
 */
function emergencyAuthorityBonus(query: string, source: string): number {
  const name = source.toLocaleLowerCase()
  if (
    MEDICAL_INTENT.test(query) &&
    (name.includes('medlineplus') || name.includes('wikipedia_en_medicine'))
  ) {
    return -110
  }
  if (
    CIVIL_EMERGENCY_INTENT.test(query) &&
    (name.includes('ready.gov') || name.includes('cdc.gov'))
  ) {
    return -110
  }
  return 0
}

/** Rank literal title relevance before source preference. */
export function titleSuggestionScore(query: string, result: RankedTitle): number {
  const term = normalized(query)
  const title = normalized(result.value)
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const containsWholeTerm = new RegExp(`(^|[^a-z0-9])${escapedTerm}(?=$|[^a-z0-9])`).test(title)
  let titleScore = 50

  if (title === term) titleScore = 0
  else if (title.startsWith(term) && /[^a-z0-9]/.test(title.charAt(term.length))) titleScore = 10
  else if (containsWholeTerm) titleScore = 20
  else if (title.startsWith(term)) titleScore = 35
  else if (title.includes(term)) titleScore = 40

  return (
    titleScore * 10 + sourcePriority(result.source) + emergencyAuthorityBonus(term, result.source)
  )
}

export function rankTitleSuggestions<T extends RankedTitle>(query: string, results: T[]): T[] {
  return [...results].sort(
    (a, b) =>
      titleSuggestionScore(query, a) - titleSuggestionScore(query, b) ||
      a.value.localeCompare(b.value)
  )
}

/** Keep one prolific archive from crowding every other useful source out of the list. */
export function selectDiverseTitleSuggestions<T extends RankedTitle>(
  query: string,
  results: T[],
  limit = 12,
  perSourceLimit = 4
): T[] {
  const selected: T[] = []
  const sourceCounts = new Map<string, number>()
  for (const result of rankTitleSuggestions(query, results)) {
    const count = sourceCounts.get(result.source) ?? 0
    if (count >= perSourceLimit) continue
    selected.push(result)
    sourceCounts.set(result.source, count + 1)
    if (selected.length >= limit) break
  }
  return selected
}
