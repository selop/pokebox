import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

test.describe('Mobile card navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#canvas-container')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('nav buttons are visible on mobile', async ({ page }) => {
    const prevBtn = page.locator('button[aria-label="Previous card"]')
    const nextBtn = page.locator('button[aria-label="Next card"]')
    await expect(prevBtn).toBeVisible()
    await expect(nextBtn).toBeVisible()
  })

  test('next button advances to next card', async ({ page }) => {
    const cardSelect = page.locator('.toolbar-select').nth(1)
    const initialCard = await cardSelect.inputValue()

    await page.locator('button[aria-label="Next card"]').click()

    const newCard = await cardSelect.inputValue()
    expect(newCard).not.toBe(initialCard)
  })

  test('prev button goes to previous card', async ({ page }) => {
    // Navigate forward first so we have a known state
    const nextBtn = page.locator('button[aria-label="Next card"]')
    await nextBtn.click()

    const cardSelect = page.locator('.toolbar-select').nth(1)
    const afterNext = await cardSelect.inputValue()

    await page.locator('button[aria-label="Previous card"]').click()

    const afterPrev = await cardSelect.inputValue()
    expect(afterPrev).not.toBe(afterNext)
  })

  test('prev from first card wraps to last', async ({ page }) => {
    // Get the first card ID
    const cardSelect = page.locator('.toolbar-select').nth(1)
    const firstOption = await cardSelect.locator('option').first().getAttribute('value')
    const lastOption = await cardSelect.locator('option').last().getAttribute('value')

    // Ensure we're on the first card
    await cardSelect.selectOption(firstOption!)
    await expect(cardSelect).toHaveValue(firstOption!)

    // Navigate backward — should wrap to last
    await page.locator('button[aria-label="Previous card"]').click()
    await expect(cardSelect).toHaveValue(lastOption!)
  })
})

test.describe('Desktop hides mobile nav', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('nav buttons are hidden on desktop', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#canvas-container')).toBeVisible()
    await page.keyboard.press('Escape')

    const prevBtn = page.locator('button[aria-label="Previous card"]')
    await expect(prevBtn).toBeHidden()
  })
})
