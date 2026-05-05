import sharp from 'sharp'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { thumbsDir } from '../util/paths'

const SIZE = 256

export const ThumbnailService = {
  thumbPath(hash: string): string {
    const dir = thumbsDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return join(dir, `${hash}.jpg`)
  },

  async generate(srcPath: string, hash: string): Promise<{
    path: string; width: number; height: number
  }> {
    const out = this.thumbPath(hash)
    if (existsSync(out)) {
      const meta = await sharp(srcPath).metadata()
      return { path: out, width: meta.width ?? 0, height: meta.height ?? 0 }
    }
    const meta = await sharp(srcPath).metadata()
    await sharp(srcPath)
      .rotate()
      .resize({ width: SIZE, height: SIZE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(out)
    return { path: out, width: meta.width ?? 0, height: meta.height ?? 0 }
  },

  async generateBatch(items: { srcPath: string; hash: string }[], onProgress?: (done: number, total: number) => void) {
    let done = 0
    const concurrency = 4
    const queue = [...items]
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const item = queue.shift()!
        try { await this.generate(item.srcPath, item.hash) } catch { /* skip */ }
        done++; onProgress?.(done, items.length)
      }
    })
    await Promise.all(workers)
  },
}
