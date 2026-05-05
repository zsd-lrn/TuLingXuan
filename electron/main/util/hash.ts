import { createHash } from 'crypto'
import { createReadStream } from 'fs'

export async function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256')
    const s = createReadStream(path)
    s.on('data', (c) => h.update(c))
    s.on('end', () => resolve(h.digest('hex').slice(0, 32))) // first 16 bytes hex
    s.on('error', reject)
  })
}
