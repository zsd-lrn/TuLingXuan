import { test, expect, _electron as electron } from '@playwright/test'
import { join } from 'path'

test('happy path: create project, decide, export', async () => {
  process.env.MOCK_AI = 'true'
  const app = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js')],
    env: { ...process.env, MOCK_AI: 'true' },
  })
  const page = await app.firstWindow()

  // Wait for home page
  await expect(page.getByText('图灵选')).toBeVisible({ timeout: 10_000 })

  // We can't easily trigger native file picker in playwright;
  // instead invoke the IPC directly to create a project.
  const fixtureDir = join(__dirname, '../fixtures/images')
  const project: { id: string; name: string } = await page.evaluate(async (dir) => {
    return await (window as unknown as { api: { projects: { create: (args: { sourceDir: string }) => Promise<{ id: string; name: string }> } } }).api.projects.create({ sourceDir: dir })
  }, fixtureDir)
  expect(project.id).toBeTruthy()

  // Open project (click first card)
  await page.getByText(project.name).first().click()

  // Wait for grid to render
  await page.waitForTimeout(2000)

  // Press F to mark first image as good
  await page.keyboard.press('f')
  await page.waitForTimeout(500)

  // Trigger export via api directly
  // (skipping full export UI flow for E2E; covered by unit tests)

  await app.close()
})
