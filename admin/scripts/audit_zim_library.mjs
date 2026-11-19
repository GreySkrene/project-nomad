#!/usr/bin/env node

/**
 * Exhaustively scan ZIM directory entries and HTML payload structure.
 *
 * This deliberately reports measurable signals instead of declaring content
 * "good": container readability, entry counts, title-only/thin HTML pages, and
 * external-link dependence. Human usefulness review remains a separate step.
 *
 * RESOURCE WARNING: scan one archive at a time in an isolated/stopped-service
 * environment. libzim can retain enough data while walking a large archive to
 * exhaust the live NOMAD WSL instance. This script intentionally refuses to
 * scan multiple archives unless --allow-multiple is supplied.
 */

import { writeFile } from 'node:fs/promises'
import { Archive } from '@openzim/libzim'

const args = process.argv.slice(2)
const paths = []
let output = null
let maxHtmlBytes = 8 * 1024 * 1024
let allowMultiple = false
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--output') output = args[++i]
  else if (args[i] === '--max-html-bytes') maxHtmlBytes = Number(args[++i])
  else if (args[i] === '--allow-multiple') allowMultiple = true
  else paths.push(args[i])
}

if (!paths.length) {
  console.error('Usage: node audit_zim_library.mjs [--output report.json] archive.zim [...]')
  process.exit(2)
}

if (paths.length > 1 && !allowMultiple) {
  console.error(
    'Refusing to scan multiple ZIMs in one process. Run one archive at a time, or pass --allow-multiple in an isolated environment.'
  )
  process.exit(2)
}

function textFromHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|ensp|emsp);/gi, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, 'x')
    .replace(/\s+/g, ' ')
    .trim()
}

function metadata(archive, key) {
  try {
    return archive.getMetadata(key)
  } catch {
    return null
  }
}

function pushSample(list, value, limit = 50) {
  if (list.length < limit) list.push(value)
}

async function audit(path) {
  const startedAt = new Date().toISOString()
  const archive = new Archive(path)
  const report = {
    path,
    startedAt,
    filename: archive.filename,
    filesize: Number(archive.filesize),
    uuid: archive.uuid,
    counts: {
      allEntriesDeclared: archive.allEntryCount,
      userEntriesDeclared: archive.entryCount,
      articlesDeclared: archive.articleCount,
      mediaDeclared: archive.mediaCount,
      entriesScanned: 0,
      redirects: 0,
      htmlPages: 0,
      htmlReadErrors: 0,
      oversizedHtmlSkipped: 0,
      titleOnlyPages: 0,
      textUnder80: 0,
      textUnder250: 0,
      textUnder1000: 0,
      pagesWithExternalLinks: 0,
      externalLinks: 0,
      pagesWithRelativeLinks: 0,
      relativeLinks: 0,
    },
    indexes: {
      title: archive.hasTitleIndex(),
      fulltext: archive.hasFulltextIndex(),
    },
    checksum: {
      present: archive.hasChecksum,
      value: archive.hasChecksum ? archive.checksum : null,
      valid: archive.hasChecksum ? archive.check() : null,
    },
    metadata: Object.fromEntries(
      ['Title', 'Description', 'Creator', 'Publisher', 'Date', 'Language', 'Tags', 'Name']
        .map((key) => [key, metadata(archive, key)])
    ),
    samples: {
      titleOnly: [],
      thinUnder80: [],
      externalLinkHeavy: [],
      readErrors: [],
      oversizedHtml: [],
    },
  }

  for (const entry of archive.iterEfficient()) {
    report.counts.entriesScanned += 1
    if (report.counts.entriesScanned % 10000 === 0) {
      console.error(`${path}: ${report.counts.entriesScanned}/${archive.allEntryCount}`)
    }
    if (entry.isRedirect) {
      report.counts.redirects += 1
      continue
    }

    let item
    try {
      item = entry.item
    } catch (error) {
      pushSample(report.samples.readErrors, { path: entry.path, error: String(error) })
      continue
    }
    if (item.mimetype !== 'text/html') continue

    report.counts.htmlPages += 1
    if (Number(item.size) > maxHtmlBytes) {
      report.counts.oversizedHtmlSkipped += 1
      pushSample(report.samples.oversizedHtml, {
        path: entry.path,
        title: entry.title,
        htmlBytes: Number(item.size),
      })
      continue
    }
    try {
      const html = item.data.toString()
      const text = textFromHtml(html)
      const external = (html.match(/\bhref\s*=\s*["'](?:https?:)?\/\//gi) || []).length
      const relative = (html.match(/\bhref\s*=\s*["'](?![a-z][\w+.-]*:|\/\/|#)/gi) || []).length
      const record = { path: entry.path, title: entry.title, htmlBytes: Buffer.byteLength(html), textChars: text.length }

      if (text === entry.title.trim() || text.length <= entry.title.trim().length + 5) {
        report.counts.titleOnlyPages += 1
        pushSample(report.samples.titleOnly, record)
      }
      if (text.length < 80) {
        report.counts.textUnder80 += 1
        pushSample(report.samples.thinUnder80, record)
      }
      if (text.length < 250) report.counts.textUnder250 += 1
      if (text.length < 1000) report.counts.textUnder1000 += 1
      if (external > 0) {
        report.counts.pagesWithExternalLinks += 1
        report.counts.externalLinks += external
        if (external >= 10) pushSample(report.samples.externalLinkHeavy, { ...record, externalLinks: external })
      }
      if (relative > 0) {
        report.counts.pagesWithRelativeLinks += 1
        report.counts.relativeLinks += relative
      }
    } catch (error) {
      report.counts.htmlReadErrors += 1
      pushSample(report.samples.readErrors, { path: entry.path, title: entry.title, error: String(error) })
    }

  }

  report.finishedAt = new Date().toISOString()
  return report
}

const reports = []
for (const path of paths) {
  reports.push(await audit(path))
  if (output) {
    await writeFile(output, `${JSON.stringify({ schemaVersion: 1, reports }, null, 2)}\n`, 'utf8')
  }
}
if (!output) process.stdout.write(`${JSON.stringify({ schemaVersion: 1, reports }, null, 2)}\n`)
