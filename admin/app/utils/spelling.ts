export type SpellingIndex = {
  words: Set<string>
  byLength: Map<number, string[]>
}

export function buildSpellingIndex(words: Iterable<string>): SpellingIndex {
  const exact = new Set<string>()
  const byLength = new Map<number, string[]>()

  for (const rawWord of words) {
    const word = rawWord.trim().toLowerCase()
    if (!/^[a-z]+$/.test(word) || exact.has(word)) continue
    exact.add(word)
    const bucket = byLength.get(word.length) ?? []
    bucket.push(word)
    byLength.set(word.length, bucket)
  }

  return { words: exact, byLength }
}

/** Optimal-string-alignment distance: ordinary edits plus one adjacent transposition. */
export function editDistance(left: string, right: string): number {
  const a = left.toLowerCase()
  const b = right.toLowerCase()
  const rows = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1))

  for (let i = 0; i <= a.length; i++) rows[i][0] = i
  for (let j = 0; j <= b.length; j++) rows[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const substitution = rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, substitution)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1)
      }
    }
  }

  return rows[a.length][b.length]
}

function maxCorrectionDistance(length: number): number {
  if (length <= 4) return 1
  if (length <= 8) return 2
  return 3
}

export function correctWord(rawWord: string, index: SpellingIndex): string | null {
  const word = rawWord.toLowerCase()
  if (word.length < 4 || index.words.has(word)) return null

  const maximum = maxCorrectionDistance(word.length)
  let best: { word: string; distance: number } | null = null

  for (let length = word.length - maximum; length <= word.length + maximum; length++) {
    for (const candidate of index.byLength.get(length) ?? []) {
      // First-letter changes are uncommon and make short-word corrections noisy.
      if (candidate[0] !== word[0]) continue
      const distance = editDistance(word, candidate)
      if (distance > maximum) continue
      if (!best || distance < best.distance || (distance === best.distance && candidate < best.word)) {
        best = { word: candidate, distance }
      }
    }
  }

  if (!best || 1 - best.distance / Math.max(word.length, best.word.length) < 0.7) return null
  return best.word
}

export function suggestSpelling(query: string, index: SpellingIndex): string | null {
  let changed = false
  const corrected = query.replace(/[A-Za-z]+/g, (token) => {
    const replacement = correctWord(token, index)
    if (!replacement) return token
    changed = true
    if (/^[A-Z]/.test(token)) return replacement[0].toUpperCase() + replacement.slice(1)
    return replacement
  })
  return changed ? corrected : null
}
