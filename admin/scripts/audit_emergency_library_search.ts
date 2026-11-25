import { selectDiverseTitleSuggestions } from '../inertia/lib/library_search_rank.js'

type ZimFile = { name: string; title?: string }
type KiwixSuggestion = {
  value: string
  kind: 'path' | 'pattern'
  path?: string
  source: string
  sourceTitle: string
}

type SearchGate = {
  id: string
  query: string
  relevantTitle: RegExp
  trustedSource: RegExp
}

const NOMAD_URL = process.env.NOMAD_URL ?? 'http://localhost:8080'
const KIWIX_URL = process.env.KIWIX_URL ?? 'http://localhost:8090'

// These are discoverability gates, not medical-content validation. A passing title
// must still lead to a readable original article whose advice is evaluated separately.
const gates: SearchGate[] = [
  {
    id: 'cpr',
    query: 'CPR',
    relevantTitle: /\b(cpr|cardiopulmonary resuscitation)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'choking',
    query: 'choking',
    relevantTitle: /\bchoking\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'bleeding',
    query: 'bleeding',
    relevantTitle: /\b(bleeding|hemorrhage|haemorrhage)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'burns',
    query: 'burn',
    relevantTitle: /\bburns?\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'fractures-and-splints',
    query: 'splint',
    relevantTitle: /\b(splint|fracture|broken bone)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'shock',
    query: 'shock',
    relevantTitle: /\bshock\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'wound-care',
    query: 'wound care',
    relevantTitle: /\b(wound|first aid)\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'water-purification',
    query: 'water',
    relevantTitle: /\bwater\b/i,
    trustedSource: /Ready\.gov/i,
  },
  {
    id: 'carbon-monoxide',
    query: 'carbon monoxide poisoning',
    relevantTitle: /\bcarbon monoxide poisoning\b/i,
    trustedSource: /WikiMed|MedlinePlus/i,
  },
  {
    id: 'emergency-heat',
    query: 'power outage',
    relevantTitle: /\b(power outage|winter storm|hypothermia|extreme cold)\b/i,
    trustedSource: /Ready\.gov/i,
  },
]

function sourceName(filename: string): string {
  return filename.replace(/\.zim$/i, '')
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return (await response.json()) as T
}

async function suggestionsFor(file: ZimFile, query: string): Promise<KiwixSuggestion[]> {
  const source = sourceName(file.name)
  const url = new URL('/suggest', KIWIX_URL)
  url.searchParams.set('content', source)
  url.searchParams.set('term', query)
  url.searchParams.set('count', '8')
  const results = await json<Array<Omit<KiwixSuggestion, 'source' | 'sourceTitle'>>>(url.href)
  return results
    .filter((result) => result.kind === 'path' && result.path)
    .map((result) => ({
      ...result,
      source,
      sourceTitle: file.title ?? source,
    }))
}

async function main() {
  const installed = await json<{ files: ZimFile[] }>(`${NOMAD_URL}/api/zim/list`)
  if (!installed.files.length) throw new Error('NOMAD reports no installed ZIM libraries')

  let failed = 0
  const report = []
  for (const gate of gates) {
    const settled = await Promise.allSettled(
      installed.files.map((file) => suggestionsFor(file, gate.query))
    )
    const reachable = settled.filter((result) => result.status === 'fulfilled')
    const combined = reachable.flatMap((result) => result.value)
    const selected = selectDiverseTitleSuggestions(gate.query, combined, 12, 4)
    const relevant = selected.find(
      (result) =>
        gate.relevantTitle.test(result.value) && gate.trustedSource.test(result.sourceTitle)
    )
    const passed = Boolean(relevant)
    if (!passed) failed += 1
    report.push({
      id: gate.id,
      query: gate.query,
      passed,
      relevant: relevant
        ? { title: relevant.value, source: relevant.sourceTitle, path: relevant.path }
        : null,
      topResults: selected.slice(0, 5).map((result) => ({
        title: result.value,
        source: result.sourceTitle,
      })),
      searchedLibraries: installed.files.length,
      reachableLibraries: reachable.length,
    })
  }

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        nomadUrl: NOMAD_URL,
        kiwixUrl: KIWIX_URL,
        installedLibraries: installed.files.length,
        passed: gates.length - failed,
        failed,
        gates: report,
      },
      null,
      2
    )
  )
  if (failed) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
