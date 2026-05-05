import { readdir, stat, open } from 'fs/promises'
import { join, extname } from 'path'
import { hashFile } from '../util/hash'

const EXT_OK = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

const MAGIC: { ext: string; bytes: number[] }[] = [
  { ext: '.jpg',  bytes: [0xff, 0xd8, 0xff] },
  { ext: '.jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: '.png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: '.webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF...WEBP
  { ext: '.avif', bytes: [0x00, 0x00, 0x00] },       // ftyp box prefix; loose check
]

async function isValidImage(path: string, ext: string): Promise<boolean> {
  const fh = await open(path, 'r')
  try {
    const buf = Buffer.alloc(8)
    await fh.read(buf, 0, 8, 0)
    const rule = MAGIC.find((m) => m.ext === ext)
    if (!rule) return false
    return rule.bytes.every((b, i) => buf[i] === b)
  } finally {
    await fh.close()
  }
}

export type ScanResult = {
  images: { filename: string; path: string; hash: string; sizeBytes: number }[]
  skipped: string[]
}

export async function scanImageFolder(dir: string): Promise<ScanResult> {
  const entries = await readdir(dir, { withFileTypes: true })
  const result: ScanResult = { images: [], skipped: [] }
  for (const e of entries) {
    if (!e.isFile()) continue
    const ext = extname(e.name).toLowerCase()
    const full = join(dir, e.name)
    if (!EXT_OK.has(ext)) { result.skipped.push(e.name); continue }
    try {
      if (!(await isValidImage(full, ext))) { result.skipped.push(e.name); continue }
      const st = await stat(full)
      const hash = await hashFile(full)
      result.images.push({ filename: e.name, path: full, hash, sizeBytes: st.size })
    } catch {
      result.skipped.push(e.name)
    }
  }
  return result
}
