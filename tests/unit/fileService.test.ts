import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { scanImageFolder } from '@main/services/FileService'

let dir: string
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'tlx-test-'))
  writeFileSync(join(dir, 'a.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]))
  writeFileSync(join(dir, 'b.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]))
  writeFileSync(join(dir, 'note.txt'), 'hello')   // non-image: ignore
  writeFileSync(join(dir, 'broken.jpg'), Buffer.from([0, 0, 0, 0]))  // bad header
})
afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('scanImageFolder', () => {
  it('returns only valid image files with hashes', async () => {
    const result = await scanImageFolder(dir)
    expect(result.images.map((i) => i.filename).sort()).toEqual(['a.jpg', 'b.png'])
    for (const img of result.images) {
      expect(img.hash).toMatch(/^[0-9a-f]{32}$/)
      expect(img.sizeBytes).toBeGreaterThan(0)
    }
    expect(result.skipped).toContain('note.txt')
    expect(result.skipped).toContain('broken.jpg')
  })
})
