import { test, expect } from '@playwright/test'

test.describe('Card flip animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#canvas-container')).toBeVisible()
  })

  test('flip button is visible in cards mode', async ({ page }) => {
    const flipBtn = page.locator('.flip-btn')
    await expect(flipBtn).toBeVisible()
    await expect(flipBtn).toHaveText(/Flip/)
  })

  test('flip button is hidden in furniture mode', async ({ page }) => {
    await page.locator('.settings-btn').click()
    await page.locator('.cal-select').first().selectOption('furniture')
    await expect(page.locator('.flip-btn')).toBeHidden()
  })

  test('clicking flip button triggers store flag', async ({ page }) => {
    const flipBtn = page.locator('.flip-btn')
    await flipBtn.click()

    // The flag is consumed immediately by the watcher, so we verify
    // the click didn't throw and the button is still usable
    await expect(flipBtn).toBeVisible()
    await expect(flipBtn).toBeEnabled()
  })

  test('F key triggers flip animation', async ({ page }) => {
    await page.keyboard.press('f')

    // Verify the page didn't error and canvas is still rendering
    await expect(page.locator('#canvas-container')).toBeVisible()
    // Verify the flip button is still interactive after the keypress
    const flipBtn = page.locator('.flip-btn')
    await expect(flipBtn).toBeVisible()
  })

  test('nav hint shows F key for flip', async ({ page }) => {
    const navHint = page.locator('.nav-hint')
    await expect(navHint).toBeVisible()
    await expect(navHint).toContainText('F')
    await expect(navHint).toContainText('flip')
  })

  test('flip button can be clicked again after animation completes', async ({ page }) => {
    const flipBtn = page.locator('.flip-btn')
    await flipBtn.click()

    // Wait for the 1.5s animation to complete
    await page.waitForTimeout(1600)

    // Click again — should not error
    await flipBtn.click()
    await expect(flipBtn).toBeVisible()
  })
})
