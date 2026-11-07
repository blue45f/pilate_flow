import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('R5 browser proof deliverables, format-patch recovery files, and <=800 line limits', () => {
  const metricsPath = path.join(__dirname, 'evidence', 'r5-browser-proof-metrics.json')
  assert.ok(fs.existsSync(metricsPath), 'r5-browser-proof-metrics.json must exist')
  const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'))

  assert.equal(metrics.environment.webkitSafariRuntime.available, false)
  assert.equal(metrics.environment.webkitSafariRuntime.status, 'UNVERIFIED (미검증)')

  // R5-01 before vs after
  assert.equal(metrics.before.r5_01.headerStyleTranslate, '0px 282px')
  assert.equal(metrics.before.r5_01.headerOverlapsCard13, true)
  assert.equal(metrics.before.r5_01.reDragOverlayCount, 0)
  assert.equal(metrics.after.r5_01.headerStyleTranslate, '')
  assert.equal(metrics.after.r5_01.headerOverlapsCard13, false)
  assert.equal(metrics.after.r5_01.reDragOverlayCount, 1)
  assert.equal(metrics.after.r5_01.headerStyleTranslateAfterBlur, '')
  assert.equal(metrics.after.r5_01.headerStyleTranslateAfterVisibilityChange, '')

  // R5-02 before vs after (<160ms rapid re-drag at 200% zoom)
  assert.equal(metrics.before.r5_02.concurrentOverlayCount, 2)
  assert.equal(metrics.before.r5_02.activeOverlayWidthMatchesSourceCard, false)
  assert.equal(metrics.after.r5_02.concurrentOverlayCount, 2)
  assert.equal(metrics.after.r5_02.activeOverlayWidthMatchesSourceCard, true)
  assert.equal(metrics.after.r5_02.overlayCountAfterSettle, 0)

  // R5-03 before vs after (unfocused touch Escape)
  assert.equal(metrics.before.r5_03.overlayCountAfterUnfocusedEscape, 1)
  assert.equal(metrics.after.r5_03.overlayCountAfterUnfocusedEscape, 0)
  assert.equal(metrics.after.r5_03.neighborCard2TransformAfterUnfocusedEscape, '')

  // R5-04 before vs after (5x rapid keyboard reorder)
  assert.equal(metrics.before.r5_04.indexAfter5ArrowDown, 1)
  assert.equal(metrics.after.r5_04.indexAfter5ArrowDown, 5)
  assert.equal(metrics.after.r5_04.indexAfter5ArrowUp, 0)

  // Viewport matrix (320 / 390 / 768 / 1440 x 100% / 200%)
  const matrixEntries = Object.values(metrics.candidateViewportMatrix)
  assert.equal(matrixEntries.length, 8)
  for (const entry of matrixEntries) {
    assert.equal(entry.horizontalOverflowPx, 0)
    assert.equal(entry.overlayCountDuringDrag, 1)
    assert.equal(entry.overlayRect.width, entry.sourceCardRect.width)
    assert.equal(entry.overlayCountAfterDrop, 0)
  }

  // Verify format-patch files, byte sizes, and SHA-256
  const patch1Path = path.join(__dirname, 'patches', '0001-be5a842-test-builder-r5-01-04-pure-regression.patch')
  const patch2Path = path.join(__dirname, 'patches', '0002-e365b82-fix-builder-r5-01-04-minimal-candidate.patch')
  const patch1Buf = fs.readFileSync(patch1Path)
  const patch2Buf = fs.readFileSync(patch2Path)
  assert.equal(patch1Buf.length, 23770)
  assert.equal(patch2Buf.length, 7301)
  assert.equal(
    crypto.createHash('sha256').update(patch1Buf).digest('hex'),
    '86e4313811f5440cc9ee2369331b584cee22c734a09953db224dccb2ad71a5e9',
  )
  assert.equal(
    crypto.createHash('sha256').update(patch2Buf).digest('hex'),
    'ab05055a2572a008cd9982f2567bd3a53174b739af21f7b08ed161e929199a19',
  )

  // Verify 8 videos and 18 screenshots exist and are non-empty
  const videosDir = path.join(__dirname, 'videos')
  const screenshotsDir = path.join(__dirname, 'screenshots')
  assert.equal(fs.readdirSync(videosDir).filter((f) => f.endsWith('.mp4') || f.endsWith('.webm')).length, 8)
  assert.equal(fs.readdirSync(screenshotsDir).filter((f) => f.endsWith('.png')).length, 18)

  // Verify <= 800 lines per text file
  const textFiles = [
    path.join(__dirname, 'README.md'),
    path.join(__dirname, 'verify-r5-browser-proof.mjs'),
    path.join(__dirname, 'track-b-r5-browser-proof-audit.node-test.mjs'),
    metricsPath,
    patch1Path,
    patch2Path,
  ]
  for (const tf of textFiles) {
    const lineCount = fs.readFileSync(tf, 'utf8').split('\n').length
    assert.ok(lineCount <= 800, `Expected <= 800 lines for ${path.basename(tf)}, got ${lineCount}`)
  }
})
