import { test, expect } from '@playwright/test'

/** Card mesh data exposed by __POKEBOX_DEBUG__ in dev mode. */
interface CardMeshInfo {
  id: string
  heroIndex: number | undefined
  x: number
  y: number
  z: number
  scaleX: number
  rotY: number
  target:
    | { x: number; y: number; z: number; rotY: number; scale: number }
    | undefined
}

/**
 * Wait for the hero carousel to fully load — meshes appear asynchronously
 * after set JSONs and textures resolve.
 */
async function waitForCarouselMeshes(
  page: ReturnType<typeof test['info']> extends never ? never : Awaited<Parameters<Parameters<typeof test>[1]>[0]>['page'],
  minCount = 9,
  timeoutMs = 15_000,
) {
  await page.waitForFunction(
    ({ min }) => {
      const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
        | { getCardMeshes: () => CardMeshInfo[] }
        | undefined
      if (!debug) return false
      const meshes = debug.getCardMeshes()
      return meshes.length >= min
    },
    { min: minCount },
    { timeout: timeoutMs },
  )
}

/** Read card mesh data from the page's debug bridge. */
async function getCardMeshes(
  page: Awaited<Parameters<Parameters<typeof test>[1]>[0]>['page'],
): Promise<CardMeshInfo[]> {
  return page.evaluate(() => {
    const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
      | { getCardMeshes: () => CardMeshInfo[] }
      | undefined
    return debug ? debug.getCardMeshes() : []
  })
}

test.describe('Merry-go-round carousel', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test.beforeEach(async ({ page }) => {
    // Navigate without URL params → triggers hero showcase / carousel mode
    await page.goto('/')
    await expect(page.locator('#canvas-container')).toBeVisible()
    // Wait for carousel meshes to load
    await waitForCarouselMeshes(page)
  })

  test('all 9 hero cards are rendered in carousel', async ({ page }) => {
    const meshes = await getCardMeshes(page)
    expect(meshes.length).toBe(9)
    // Every mesh should have a carouselTarget
    for (const m of meshes) {
      expect(m.target).toBeTruthy()
    }
  })

  test('front card has the largest scale', async ({ page }) => {
    const meshes = await getCardMeshes(page)
    // Find the card closest to the viewer (smallest |target.rotY|)
    const sorted = [...meshes]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))
    const front = sorted[0]!
    const others = sorted.slice(1)
    for (const m of others) {
      expect(front.target!.scale).toBeGreaterThanOrEqual(m.target!.scale - 0.01)
    }
  })

  test('adjacent cards do not overlap at target positions', async ({ page }) => {
    // Compute centerCardW from known defaults to check overlap
    const info = await page.evaluate(() => {
      const debug = (window as Record<string, unknown>).__POKEBOX_DEBUG__ as
        | { getCardMeshes: () => CardMeshInfo[] }
        | undefined
      if (!debug) return null
      const meshes = debug.getCardMeshes()
      return { meshes }
    })
    expect(info).toBeTruthy()

    const meshes = info!.meshes
    expect(meshes.length).toBe(9)

    // Sort by target.rotY to get cards in ring order
    const withTargets = meshes.filter((m) => m.target)
    const sorted = [...withTargets].sort(
      (a, b) => a.target!.rotY - b.target!.rotY,
    )

    // CARD_ASPECT = 733/1024, config defaults
    const CARD_ASPECT = 733 / 1024
    const screenHeightCm = 24.81
    const worldScale = 1.0
    const viewportAspect = 1280 / 800
    const screenH = screenHeightCm * worldScale
    const singleCardSize = Math.min(0.85, (viewportAspect / CARD_ASPECT) * 0.9)
    const centerCardH = screenH * singleCardSize * 0.65
    const centerCardW = centerCardH * CARD_ASPECT

    // Check each pair of adjacent cards in ring order using projected widths.
    // Cards rotated in Y project to a narrower screen footprint:
    // projected half-width = centerCardW * scale * |cos(rotY)| / 2
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]!
      const b = sorted[(i + 1) % sorted.length]!

      // Skip pairs that wrap around the back (one at -PI, other at +PI)
      const angleDist = Math.abs(a.target!.rotY - b.target!.rotY)
      if (angleDist > Math.PI) continue

      // Skip back-of-ring pairs where both cards face away (|rotY| > 90°)
      if (
        Math.abs(a.target!.rotY) > Math.PI / 2 &&
        Math.abs(b.target!.rotY) > Math.PI / 2
      )
        continue

      const dist = Math.abs(b.target!.x - a.target!.x)
      const halfWidthA =
        (centerCardW * a.target!.scale * Math.abs(Math.cos(a.target!.rotY))) / 2
      const halfWidthB =
        (centerCardW * b.target!.scale * Math.abs(Math.cos(b.target!.rotY))) / 2
      const minDist = halfWidthA + halfWidthB

      expect(
        dist,
        `Cards at rotY=${a.target!.rotY.toFixed(2)} and ${b.target!.rotY.toFixed(2)} overlap: dist=${dist.toFixed(1)} < minDist=${minDist.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(minDist * 0.95) // 5% tolerance for float animation
    }
  })

  test('N key advances the carousel', async ({ page }) => {
    const before = await getCardMeshes(page)
    const frontBefore = [...before]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))[0]!

    await page.keyboard.press('n')
    // Wait for targets to update
    await page.waitForTimeout(200)

    const after = await getCardMeshes(page)
    const frontAfter = [...after]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))[0]!

    // The front card should have changed
    expect(frontAfter.heroIndex).not.toBe(frontBefore.heroIndex)
  })

  test('B key reverses the carousel', async ({ page }) => {
    const before = await getCardMeshes(page)
    const frontBefore = [...before]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))[0]!

    await page.keyboard.press('b')
    await page.waitForTimeout(200)

    const after = await getCardMeshes(page)
    const frontAfter = [...after]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))[0]!

    expect(frontAfter.heroIndex).not.toBe(frontBefore.heroIndex)
  })

  test('carousel auto-advances after ~5.5 seconds', async ({ page }) => {
    const before = await getCardMeshes(page)
    const frontBefore = [...before]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))[0]!

    // Wait for auto-advance (5.5s interval + buffer)
    await page.waitForTimeout(6500)

    const after = await getCardMeshes(page)
    const frontAfter = [...after]
      .filter((m) => m.target)
      .sort((a, b) => Math.abs(a.target!.rotY) - Math.abs(b.target!.rotY))[0]!

    expect(frontAfter.heroIndex).not.toBe(frontBefore.heroIndex)
  })

  test('all cards stay within box boundaries', async ({ page }) => {
    const meshes = await getCardMeshes(page)

    const screenHeightCm = 24.81
    const worldScale = 1.0
    const viewportAspect = 1280 / 800
    const screenH = screenHeightCm * worldScale
    const screenW = screenH * viewportAspect

    const CARD_ASPECT = 733 / 1024
    const aspect = viewportAspect
    const singleCardSize = Math.min(0.85, (aspect / CARD_ASPECT) * 0.9)
    const centerCardH = screenH * singleCardSize * 0.65
    const centerCardW = centerCardH * CARD_ASPECT
    const halfBoxW = screenW / 2

    for (const m of meshes) {
      if (!m.target) continue
      const halfCardW = (centerCardW * m.target.scale) / 2
      const rightEdge = Math.abs(m.target.x) + halfCardW
      expect(
        rightEdge,
        `Card at rotY=${m.target.rotY.toFixed(2)} extends beyond box (edge=${rightEdge.toFixed(1)}, halfBox=${halfBoxW.toFixed(1)})`,
      ).toBeLessThanOrEqual(halfBoxW * 1.05) // 5% tolerance
    }
  })
})
