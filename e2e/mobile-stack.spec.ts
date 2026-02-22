import { test, expect } from '@playwright/test'

test.use({
  viewport: { width: 375, height: 812 },
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
})

test.describe('Mobile stack cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#canvas-container')).toBeVisible()
    // Dismiss instructions overlay
    await page.locator('.instructions .close-btn').click()
  })

  test('pack opening enters stack mode and hides modal', async ({ page }) => {
    // Open the booster modal
    await page.locator('.nav-btn:has-text("Packs")').click({ force: true })
    await expect(page.locator('.booster-backdrop')).toBeVisible()

    // Click a non-active pack
    await page.locator('.booster-pack:not(.active)').first().click()

    // Modal should close after animation + load
    await expect(page.locator('.booster-backdrop')).toBeHidden({ timeout: 10000 })
  })

  test('arrow nav buttons are hidden in stack mode', async ({ page }) => {
    // Verify arrows are visible initially (single mode)
    await expect(page.locator('button[aria-label="Previous card"]')).toBeVisible()
    await expect(page.locator('button[aria-label="Next card"]')).toBeVisible()

    // Open pack to enter stack mode
    await page.locator('.nav-btn:has-text("Packs")').click({ force: true })
    await expect(page.locator('.booster-backdrop')).toBeVisible()
    await page.locator('.booster-pack:not(.active)').first().click()
    await expect(page.locator('.booster-backdrop')).toBeHidden({ timeout: 10000 })

    // Arrow buttons should be hidden in stack mode
    await expect(page.locator('button[aria-label="Previous card"]')).toBeHidden()
    await expect(page.locator('button[aria-label="Next card"]')).toBeHidden()

    // Packs button should still be visible
    await expect(page.locator('.nav-btn:has-text("Packs")')).toBeVisible()
  })

  test('slideshow button is hidden in stack mode', async ({ page }) => {
    // Open pack to enter stack mode
    await page.locator('.nav-btn:has-text("Packs")').click({ force: true })
    await expect(page.locator('.booster-backdrop')).toBeVisible()
    await page.locator('.booster-pack:not(.active)').first().click()
    await expect(page.locator('.booster-backdrop')).toBeHidden({ timeout: 10000 })

    // Slideshow button should be hidden in stack mode
    await expect(page.locator('.toolbar-btn:has-text("Slideshow")')).toBeHidden()
  })
})
