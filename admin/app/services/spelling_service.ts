import { readFile } from 'node:fs/promises'
import wordListPath from 'word-list'
import { buildSpellingIndex, suggestSpelling, type SpellingIndex } from '../utils/spelling.js'

let indexPromise: Promise<SpellingIndex> | null = null

function getIndex(): Promise<SpellingIndex> {
  indexPromise ??= readFile(wordListPath, 'utf8').then((text) => buildSpellingIndex(text.split('\n')))
  return indexPromise
}

export async function getSpellingSuggestion(query: string): Promise<string | null> {
  return suggestSpelling(query, await getIndex())
}
