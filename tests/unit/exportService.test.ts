import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { generateCSV, copyImages } from '@main/services/ExportService'

const sampleImages = [
  { id: '1', filename: 'a.jpg', path: '', userStatus: 'good', userScore: 5, aiQualityScore: 80, aiAestheticScore: 70, aiCaption: 'cap', aiPromptGuess: 'pg', tags: [{ category: 'style', value: '写实' }] },
  { id: '2', filename: 'b.png', path: '', userStatus: null, userScore: null, aiQualityScore: 60, aiAestheticScore: 50, aiCaption: 'cap2', aiPromptGuess: 'pg2', tags: [] },
] as any

describe('generateCSV', () => {
  it('returns header + rows', () => {
    const csv = generateCSV(sampleImages)
    expect(csv).toContain('filename,user_status,user_score')
    expect(csv).toContain('a.jpg,good,5')
    expect(csv).toContain('b.png,,')
  })

  it('escapes commas and quotes', () => {
    const csv = generateCSV([{ ...sampleImages[0], aiCaption: 'has, comma "and" quote' }] as any)
    expect(csv).toContain('"has, comma ""and"" quote"')
  })
})

describe('copyImages', () => {
  let src: string, dst: string
  beforeAll(() => {
    src = mkdtempSync(join(tmpdir(), 'tlx-src-'))
    dst = mkdtempSync(join(tmpdir(), 'tlx-dst-'))
    writeFileSync(join(src, 'a.jpg'), 'x')
    writeFileSync(join(src, 'b.jpg'), 'y')
  })
  afterAll(() => {
    rmSync(src, { recursive: true, force: true })
    rmSync(dst, { recursive: true, force: true })
  })

  it('copies files and returns count', async () => {
    const r = await copyImages([
      { path: join(src, 'a.jpg'), filename: 'a.jpg' },
      { path: join(src, 'b.jpg'), filename: 'b.jpg' },
    ], dst)
    expect(r.copied).toBe(2)
    expect(existsSync(join(dst, 'a.jpg'))).toBe(true)
    expect(existsSync(join(dst, 'b.jpg'))).toBe(true)
  })

  it('handles name conflicts by suffixing', async () => {
    writeFileSync(join(dst, 'a.jpg'), 'existing')
    const r = await copyImages([{ path: join(src, 'a.jpg'), filename: 'a.jpg' }], dst)
    expect(r.copied).toBe(1)
    expect(readdirSync(dst).filter((f) => f.startsWith('a'))).toHaveLength(2)
  })
})
