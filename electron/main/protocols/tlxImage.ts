import { protocol } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { extname } from 'path'
import { DatabaseService } from '../services/DatabaseService'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
}

export function registerImageProtocol() {
  protocol.handle('tlx-image', (req) => {
    const url = new URL(req.url)
    const id = url.hostname || url.pathname.replace(/^\/+/, '')
    const img = DatabaseService.getImage(id)
    if (!img) return new Response('not found', { status: 404 })
    if (!existsSync(img.path)) return new Response('source missing', { status: 404 })
    // Same WSL2 issue as tlx-thumb: net.fetch(file://) silently drops the body.
    // Read direct. For a single-image view we serve at most one big PNG at a time
    // (4-6MB); blocking is acceptable. If it ever feels sluggish, swap to a streamed
    // readable.
    const buf = readFileSync(img.path)
    const mime = MIME[extname(img.path).toLowerCase()] ?? 'application/octet-stream'
    return new Response(buf, { headers: { 'Content-Type': mime } })
  })
}

export function registerImageScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'tlx-image', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
  ])
}
