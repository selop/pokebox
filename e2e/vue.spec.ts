import { test, expect } from '@playwright/test'

test('visits the app root url', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.instructions h2')).toHaveText('Virtual Pokebox Demo')
  await expect(page.locator('.start-btn')).toBeVisible()
  await expect(page.locator('#canvas-container')).toBeVisible()
})
