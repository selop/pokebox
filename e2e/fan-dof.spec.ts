import { test, expect } from '@playwright/test'

interface FanDofState {
  fanDofMaxBlur: number
  ramping: boolean
  zoomedFanIndex: number | null
}

/** Read fan DOF state from the debug bridge. */
async function getFanDofState(page: Parameters<Parameters<typeof test>[1]>[0]['page']): Promise<FanDofState> {
  return page.evaluate(() => {
    const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
      | { getFanDofState: () => FanDofState }
      | undefined
    return debug ? debug.getFanDofState() : { fanDofMaxBlur: 0, ramping: false, zoomedFanIndex: null }
  })
}

/** Wait until the debug bridge reports at least `min` card meshes with fanIndex. */
async function waitForFanMeshes(page: Parameters<Parameters<typeof test>[1]>[0]['page'], min = 5) {
  await page.waitForFunction(
    ({ minCount }) => {
      const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
        | { getCardMeshes: () => { fanIndex: number | undefined }[] }
        | undefined
      if (!debug) return false
      const meshes = debug.getCardMeshes()
      return meshes.filter((m) => m.fanIndex !== undefined).length >= minCount
    },
    { minCount: min },
    { timeout: 15_000 },
  )
}

/**
 * Sample fanDofMaxBlur repeatedly over a time window and return all samples.
 * This lets us verify the DOF value ramps gradually rather than snapping on/off.
 */
async function sampleDofOverTime(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  durationMs: number,
  intervalMs = 50,
): Promise<number[]> {
  return page.evaluate(
    ({ dur, interval }) => {
      return new Promise<number[]>((resolve) => {
        const samples: number[] = []
        const start = Date.now()
        const timer = setInterval(() => {
          const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
            | { getFanDofState: () => { fanDofMaxBlur: number } }
            | undefined
          if (debug) samples.push(debug.getFanDofState().fanDofMaxBlur)
          if (Date.now() - start >= dur) {
            clearInterval(timer)
            resolve(samples)
          }
        }, interval)
      })
    },
    { dur: durationMs, interval: intervalMs },
  )
}

test.describe('Fan-zoom DOF transition', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    baseURL: 'https://localhost:5173',
  })

  test.beforeEach(async ({ page }) => {
    // Navigate with set param to skip hero carousel and go straight to cards
    await page.goto('/?set=A1')
    await expect(page.locator('#canvas-container')).toBeVisible()

    // Dismiss instructions modal
    const startBtn = page.locator('.start-btn')
    if (await startBtn.isVisible()) {
      await startBtn.click()
    }

    // Switch to fan mode
    // The display mode dropdown — it's the second .toolbar-select (not .card-select)
    const displayDropdown = page.locator('select.toolbar-select:not(.card-select)')
    await expect(displayDropdown).toBeVisible({ timeout: 10_000 })
    await displayDropdown.selectOption('fan')

    // Wait for fan cards to appear (with intro animation)
    await waitForFanMeshes(page)
    // Wait for intro animation to finish (~1s for all cards to settle)
    await page.waitForTimeout(1500)
  })

  test('DOF is initially off in fan mode', async ({ page }) => {
    const state = await getFanDofState(page)
    expect(state.fanDofMaxBlur).toBe(0)
    expect(state.zoomedFanIndex).toBeNull()
    expect(state.ramping).toBe(false)
  })

  test('DOF ramps gradually when zooming a fan card (not a binary switch)', async ({ page }) => {
    // Click center of canvas to hit a fan card
    const canvas = page.locator('#canvas-container')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Click roughly at the center card position — this starts the 1.2s zoom animation
    await canvas.click({ position: { x: box!.width / 2, y: box!.height * 0.45 } })

    // Wait for zoom animation to complete (~1.2s) — DOF ramp starts when zoom finishes
    await page.waitForFunction(
      () => {
        const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
          | { getFanDofState: () => { zoomedFanIndex: number | null } }
          | undefined
        return debug?.getFanDofState().zoomedFanIndex !== null
      },
      {},
      { timeout: 5_000 },
    )

    // Sample immediately — the ramp just started (1.0s duration)
    const samples = await sampleDofOverTime(page, 1200, 30)

    // Verify we got meaningful samples
    expect(samples.length).toBeGreaterThan(10)

    // The key test: DOF should NOT be binary (all 0 or all max).
    // There must be intermediate values showing a gradual ramp.
    const uniqueValues = new Set(samples.map((v) => Math.round(v * 10000)))
    // A smooth ramp over ~1s sampled every 30ms should produce many distinct values
    expect(uniqueValues.size).toBeGreaterThan(3)

    // Verify the ramp includes both small and large values (not all the same)
    const min = Math.min(...samples)
    const max = Math.max(...samples)
    expect(max).toBeGreaterThan(min)

    // Verify monotonic increase (each sample >= previous, allowing tiny float jitter)
    const nonZero = samples.filter((v) => v > 0)
    expect(nonZero.length).toBeGreaterThan(0)
    let monotonic = true
    for (let i = 1; i < nonZero.length; i++) {
      if (nonZero[i]! < nonZero[i - 1]! - 0.0001) {
        monotonic = false
        break
      }
    }
    expect(monotonic).toBe(true)
  })

  test('compositor pre-engages during zoom animation (before DOF starts)', async ({ page }) => {
    const canvas = page.locator('#canvas-container')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Click center to start zoom — DOF maxblur should still be 0 during zoom-in
    await canvas.click({ position: { x: box!.width / 2, y: box!.height * 0.45 } })

    // Sample during the zoom animation (first 800ms — zoom takes 1.2s)
    const zoomSamples = await sampleDofOverTime(page, 800, 50)

    // During zoom-in, blur should be 0 (ramp hasn't started yet)
    const allZeroDuringZoom = zoomSamples.every((v) => v === 0)
    expect(allZeroDuringZoom).toBe(true)

    // Now wait for zoom to finish and DOF to ramp
    await page.waitForFunction(
      () => {
        const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
          | { getFanDofState: () => { fanDofMaxBlur: number } }
          | undefined
        return debug ? debug.getFanDofState().fanDofMaxBlur > 0 : false
      },
      {},
      { timeout: 5_000 },
    )

    // After zoom completes, DOF should now be non-zero (ramp started)
    const state = await getFanDofState(page)
    expect(state.fanDofMaxBlur).toBeGreaterThan(0)
  })

  test('DOF ramps down when unzooming (not instant off)', async ({ page }) => {
    const canvas = page.locator('#canvas-container')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // Click center to zoom a card
    await canvas.click({ position: { x: box!.width / 2, y: box!.height * 0.45 } })

    // Wait for zoom to complete and DOF to ramp up fully
    await page.waitForFunction(
      () => {
        const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
          | { getFanDofState: () => { fanDofMaxBlur: number; ramping: boolean; zoomedFanIndex: number | null } }
          | undefined
        if (!debug) return false
        const s = debug.getFanDofState()
        // Zoomed and DOF ramp finished (not ramping, blur > 0)
        return s.zoomedFanIndex !== null && !s.ramping && s.fanDofMaxBlur > 0
      },
      {},
      { timeout: 5_000 },
    )

    const preUnzoom = await getFanDofState(page)
    expect(preUnzoom.fanDofMaxBlur).toBeGreaterThan(0)

    // Click empty space to unzoom (far corner, away from cards)
    await canvas.click({ position: { x: 50, y: 50 } })

    // Immediately start sampling DOF as it ramps down
    const samples = await sampleDofOverTime(page, 1500, 50)

    // Verify the samples show a gradual decrease, not an instant drop to 0
    const nonZero = samples.filter((v) => v > 0)
    // Some samples should still have blur (not all instantly 0)
    expect(nonZero.length).toBeGreaterThan(2)

    // Eventually should reach 0
    const lastSamples = samples.slice(-5)
    const finalBlur = lastSamples[lastSamples.length - 1]!
    expect(finalBlur).toBeLessThan(0.001)

    // Verify monotonic decrease (allowing float jitter)
    let monotonic = true
    for (let i = 1; i < samples.length; i++) {
      if (samples[i]! > samples[i - 1]! + 0.0001) {
        monotonic = false
        break
      }
    }
    expect(monotonic).toBe(true)
  })
})
