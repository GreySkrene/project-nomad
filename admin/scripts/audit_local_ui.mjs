import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PDFParse } from 'pdf-parse'

const baseUrl = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '')
const routeFilter = process.argv[3] || ''
const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const edgePath = process.env.NOMAD_EDGE_PATH || edgeCandidates.find(existsSync)
assert.ok(edgePath, 'Microsoft Edge was not found; set NOMAD_EDGE_PATH to its executable.')

const port = await new Promise((resolve, reject) => {
  const server = createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    const value = typeof address === 'object' && address ? address.port : null
    server.close((error) => (error ? reject(error) : resolve(value)))
  })
})
assert.ok(port, 'Could not reserve a local DevTools port.')

const profile = mkdtempSync(join(tmpdir(), 'nomad-ui-audit-'))
const edge = spawn(
  edgePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore', windowsHide: true }
)

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function retry(action, attempts = 50) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await action()
    } catch (error) {
      lastError = error
      await pause(100)
    }
  }
  throw lastError
}

let socket
try {
  await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`)
    assert.equal(response.ok, true)
  })
  const targetResponse = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' }
  )
  assert.equal(targetResponse.ok, true, 'Could not create an isolated browser tab.')
  const target = await targetResponse.json()

  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject, timeout } = pending.get(message.id)
    pending.delete(message.id)
    clearTimeout(timeout)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      const timeout = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Edge DevTools command timed out: ${method}`))
      }, 20_000)
      pending.set(id, { resolve, reject, timeout })
      socket.send(JSON.stringify({ id, method, params }))
    })

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })

  const accessibilityIssues = []
  const vendorAccessibilityIssues = []

  async function inspect(path, expectedText, waitMilliseconds = 1800) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    })
    await send('Page.stopLoading')
    try {
      await send('Page.navigate', { url: `${baseUrl}${path}` })
    } catch (error) {
      // Edge can commit a navigation but omit the Page.navigate response when
      // leaving a page with active requests. Continue to the independent URL,
      // text, viewport, and accessibility assertions below; they will fail if
      // the destination did not actually render.
      if (!error.message.includes('Page.navigate')) {
        throw new Error(`${path}: ${error.message}`, { cause: error })
      }
    }
    await pause(waitMilliseconds)
    let result
    for (let attempt = 0; attempt < 20; attempt += 1) {
      result = await evaluate(`(() => ({
        path: location.pathname + location.search,
        innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyText: document.body.innerText,
        duplicateIds: [...document.querySelectorAll('[id]')]
          .map((element) => element.id)
          .filter((id, index, ids) => id && ids.indexOf(id) !== index)
          .filter((id, index, ids) => ids.indexOf(id) === index),
        unnamedControls: [...document.querySelectorAll('button, a[href], input, select, textarea')]
          .filter((element) => {
            const style = getComputedStyle(element)
            if (style.display === 'none' || style.visibility === 'hidden') return false
            if (element.closest('[aria-hidden="true"]')) return false
            if (element instanceof HTMLInputElement && element.type === 'hidden') return false
            const labelledBy = element.getAttribute('aria-labelledby')
            const labelledText = labelledBy
              ? labelledBy.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ')
              : ''
            const labelText = element.id
              ? [...document.querySelectorAll('label')]
                  .find((label) => label.htmlFor === element.id)?.textContent || ''
              : element.closest('label')?.textContent || ''
            const name = [
              element.getAttribute('aria-label'),
              labelledText,
              labelText,
              element.getAttribute('title'),
              element.textContent,
              element.getAttribute('alt'),
              [...element.querySelectorAll('img[alt]')]
                .map((image) => image.getAttribute('alt'))
                .join(' '),
              element instanceof HTMLInputElement ? element.value : '',
            ].filter(Boolean).join(' ').trim()
            return !name
          })
          .slice(0, 10)
          .map((element) => element.outerHTML.slice(0, 240))
      }))()`)
      if (
        expectedText.every((text) =>
          result.bodyText.toLocaleLowerCase().includes(text.toLocaleLowerCase())
        )
      )
        break
      await pause(500)
    }
    assert.equal(result.innerWidth, 390, `${path} did not use the emulated phone viewport.`)
    assert.ok(
      result.scrollWidth <= result.innerWidth + 1,
      `${path} has horizontal overflow: ${result.scrollWidth}px content in ${result.innerWidth}px.`
    )
    if (result.duplicateIds.length || result.unnamedControls.length) {
      const issue = {
        path,
        duplicateIds: result.duplicateIds,
        unnamedControls: result.unnamedControls,
      }
      // The API reference is rendered by the bundled Scalar UI. Keep its
      // findings visible without treating dependency-owned markup as a NOMAD
      // regression that this repository can safely patch.
      if (path.startsWith('/reference')) vendorAccessibilityIssues.push(issue)
      else accessibilityIssues.push(issue)
    }
    for (const text of expectedText) {
      assert.ok(
        result.bodyText.toLocaleLowerCase().includes(text.toLocaleLowerCase()),
        `${path} did not render expected text: ${text}. Rendered: ${result.bodyText.slice(0, 800)}`
      )
    }
    return {
      path: result.path,
      innerWidth: result.innerWidth,
      scrollWidth: result.scrollWidth,
      accessibleControls: true,
    }
  }

  const reports = []
  if (!routeFilter) {
    reports.push(await inspect('/home', ['Start with the immediate need', 'Household Readiness']))
    reports.push(
      await inspect('/readiness', ['Ready', 'Information Library', 'Optional / paused'], 3000)
    )
    reports.push(await inspect('/emergency-planner', ['Portable power budget', '640']))
    reports.push(await inspect('/maps', ['Offline map snapshot', 'Manage Map Regions']))
    reports.push(
      await inspect('/library-search?view=search&q=splint', ['splint', 'Searched text from'], 3000)
    )
  }
  const maintenanceSurfaces = [
    ['/local-backup', ['Back up your local plan', 'not encrypted']],
    ['/emergency-summary', ['Emergency readiness summary']],
    ['/supply-depot', ['Apps & Services']],
    ['/easy-setup', ['What do you want NOMAD to do?']],
    ['/settings/system', ['System']],
    ['/settings/legal', ['Legal']],
    ['/settings/maps', ['Map']],
    ['/settings/models', ['Models']],
    ['/settings/update', ['Updates']],
    ['/settings/zim', ['Content']],
    ['/settings/zim/remote-explorer', ['Content']],
    ['/settings/benchmark', ['Benchmark']],
    ['/settings/support', ['Support']],
    ['/settings/advanced', ['Advanced']],
    ['/drug-reference', ['Drug Reference']],
    ['/drug-reference/interactions', ['Compare']],
    ['/conditions', ['By situation']],
    ['/chat', ['Chat']],
    ['/docs/home', ['Welcome to Project NOMAD']],
    ['/docs/faq', ['Apps & Services']],
    ['/docs/supply-depot-apps', ['Apps & Services']],
    ['/reference', ['API']],
  ]
  for (const [path, expectedText] of maintenanceSurfaces.filter(
    ([path]) => !routeFilter || path.includes(routeFilter)
  )) {
    reports.push(await inspect(path, expectedText, 1200))
  }

  const testState = {
    version: 1,
    householdSize: 2,
    targetDays: 7,
    dailyCaloriesPerPerson: 2000,
    dailyWaterGallonsPerPerson: 1,
    powerCapacityWh: 640,
    powerUsablePercent: 85,
    powerLoads: [
      { id: 'audit-radio', name: 'Audit weather radio', watts: 5, hoursPerDay: 8, quantity: 1 },
    ],
    supplies: [
      {
        id: 'audit-water',
        name: 'Audit stored water',
        category: 'water',
        quantity: 14,
        unit: 'gallons',
        caloriesTotal: 0,
        waterGallons: 14,
        reserveDays: 0,
        expiresOn: '',
        location: 'Audit profile only',
        notes: '',
      },
      {
        id: 'audit-food',
        name: 'Audit canned beans',
        category: 'food',
        quantity: 14,
        unit: 'cans',
        caloriesTotal: 7000,
        waterGallons: 0,
        reserveDays: 0,
        expiresOn: '',
        location: 'Audit profile only',
        notes: '',
      },
    ],
    outage: { startedAt: null, freezerFull: true },
    updatedAt: new Date().toISOString(),
  }
  if (
    !routeFilter ||
    '/emergency-planner'.includes(routeFilter) ||
    '/emergency-summary'.includes(routeFilter) ||
    '/local-backup'.includes(routeFilter)
  ) {
    if (reports.length === 0) {
      await send('Page.navigate', { url: `${baseUrl}/home` })
      await pause(800)
    }
    await evaluate(
      `localStorage.setItem('nomad:household-readiness:v1', ${JSON.stringify(JSON.stringify(testState))})`
    )
    reports.push(
      await inspect('/emergency-planner', [
        'Audit stored water',
        'Audit canned beans',
        '1,000 kcal/day',
        'Audit weather radio',
        'Next readiness actions',
      ])
    )
    reports.push(
      await inspect('/emergency-summary', [
        'Emergency readiness summary',
        'Audit stored water',
        'Audit canned beans',
        'Audit weather radio',
        'Print / save PDF',
      ])
    )
    // Chromium can emit a blank PDF when printToPDF inherits mobile device
    // emulation. Clear only the metrics override for the print operation; the
    // next inspect() call restores the 390px audit viewport.
    await send('Emulation.clearDeviceMetricsOverride')
    const printResult = await send('Page.printToPDF', { printBackground: true })
    assert.ok(
      printResult.data.length > 1_000,
      `Printable emergency summary PDF was empty or incomplete (${printResult.data.length} base64 characters).`
    )
    const printParser = new PDFParse({ data: Buffer.from(printResult.data, 'base64') })
    try {
      const printText = await printParser.getText()
      assert.ok(
        printText.text.includes('Emergency readiness summary'),
        `Printable emergency summary PDF did not contain its heading. Extracted: ${JSON.stringify(printText.text.slice(0, 500))}`
      )
      assert.ok(
        printText.text.includes('Audit stored water'),
        'Printable emergency summary PDF did not contain the saved inventory.'
      )
    } finally {
      await printParser.destroy()
    }
    reports.push({
      path: '/emergency-summary#print',
      pdfBytes: Math.floor((printResult.data.length * 3) / 4),
    })
    reports.push(await inspect('/local-backup', ['Household readiness', '1 local record']))
  }

  assert.deepEqual(
    accessibilityIssues,
    [],
    `Accessibility defects were found:\n${JSON.stringify(accessibilityIssues, null, 2)}`
  )
  console.log(
    JSON.stringify(
      { ok: true, viewport: '390x844', reports, vendorAccessibilityIssues },
      null,
      2
    )
  )
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close()
  edge.kill()
  await Promise.race([new Promise((resolve) => edge.once('exit', resolve)), pause(1500)])
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })
  } catch (error) {
    // Edge may keep a crash-reporting child alive briefly on Windows. The
    // profile contains only synthetic audit data and the OS temp cleaner can
    // remove it later; never turn a passing product audit into a false failure.
    if (error?.code !== 'EPERM' && error?.code !== 'EBUSY') throw error
    console.warn(`Could not immediately remove isolated audit profile: ${profile}`)
  }
}
