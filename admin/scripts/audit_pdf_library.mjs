#!/usr/bin/env node

/**
 * Audit PDF structure, metadata, and per-page extractable text.
 *
 * This records measurable completeness signals; it does not declare medical or
 * emergency advice correct. Files are processed sequentially and each parser is
 * destroyed before the next file to limit memory use.
 */

import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFParse } from 'pdf-parse'

const args = process.argv.slice(2)
const inputs = []
let output = null
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--output') output = args[++i]
  else inputs.push(args[i])
}

if (!inputs.length) {
  console.error('Usage: node audit_pdf_library.mjs [--output report.json] file-or-directory [...]')
  process.exit(2)
}

async function collectPdfPaths(input) {
  const item = await stat(input)
  if (item.isFile()) return input.toLowerCase().endsWith('.pdf') ? [input] : []
  if (!item.isDirectory()) return []
  const entries = await readdir(input, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => collectPdfPaths(path.join(input, entry.name)))
  )
  return nested.flat()
}

function isoDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

function selectMetadata(infoResult) {
  const source = infoResult.info ?? {}
  const dates = infoResult.getDateNode()
  return {
    title: source.Title ?? null,
    author: source.Author ?? null,
    subject: source.Subject ?? null,
    creator: source.Creator ?? null,
    producer: source.Producer ?? null,
    creationDate: isoDate(dates.CreationDate ?? dates.XmpCreateDate ?? dates.XapCreateDate),
    modificationDate: isoDate(dates.ModDate ?? dates.XmpModifyDate ?? dates.XapModifyDate),
  }
}

async function auditPdf(filePath) {
  const file = await readFile(filePath)
  const parser = new PDFParse({ data: file })
  try {
    // pdf.js uses a transferable worker message internally. Concurrent calls
    // against one parser can attempt to transfer the same document object twice
    // and fail with DataCloneError, so these operations must remain sequential.
    const info = await parser.getInfo({ parsePageInfo: true })
    const text = await parser.getText()
    const pages = text.pages.map((page) => ({
      page: page.num,
      textChars: page.text.trim().length,
      textWords: page.text.trim() ? page.text.trim().split(/\s+/).length : 0,
    }))
    return {
      path: filePath,
      filename: path.basename(filePath),
      bytes: file.byteLength,
      sha256: createHash('sha256').update(file).digest('hex'),
      readable: true,
      pageCount: info.total,
      extractedPages: pages.length,
      textChars: text.text.trim().length,
      textWords: text.text.trim() ? text.text.trim().split(/\s+/).length : 0,
      emptyTextPages: pages.filter((page) => page.textChars === 0).map((page) => page.page),
      thinTextPagesUnder80Chars: pages
        .filter((page) => page.textChars > 0 && page.textChars < 80)
        .map((page) => page.page),
      pages,
      links: info.pages.reduce((sum, page) => sum + page.links.length, 0),
      metadata: selectMetadata(info),
      fingerprints: info.fingerprints ?? [],
    }
  } finally {
    await parser.destroy()
  }
}

const paths = [...new Set((await Promise.all(inputs.map(collectPdfPaths))).flat())].sort()
const reports = []
for (const [index, filePath] of paths.entries()) {
  console.error(`[${index + 1}/${paths.length}] ${filePath}`)
  try {
    reports.push(await auditPdf(filePath))
  } catch (error) {
    const fileStat = await stat(filePath).catch(() => null)
    reports.push({
      path: filePath,
      filename: path.basename(filePath),
      bytes: fileStat?.size ?? null,
      readable: false,
      error: String(error?.stack ?? error),
    })
  }
  if (output) {
    await writeFile(
      output,
      `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), reports }, null, 2)}\n`,
      'utf8'
    )
  }
}

const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), reports }
if (!output) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
