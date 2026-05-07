import { protocol } from 'electron'
import { existsSync, readFileSync } from 'fs'
import { ThumbnailService } from '../services/ThumbnailService'
import { DatabaseService } from '../services/DatabaseService'

export function registerThumbProtocol() {
  protocol.handle('tlx-thumb', async (req) => {
    const url = new URL(req.url)
    const hash = url.hostname || url.pathname.replace(/^\/+/, '')
    const path = ThumbnailService.thumbPath(hash)

    // Self-heal: if thumbnail file doesn't exist, regenerate from the original image
    // (looked up by hash in DB). Robust against silent failures during initial import
    // and against thumb cache being cleared while a project is open.
    if (!existsSync(path)) {
      const src = DatabaseService.findImagePathByHash(hash)
      if (src && existsSync(src)) {
        try { await ThumbnailService.generate(src, hash) }
        catch (e) { console.warn('thumb gen failed for', hash, e) }
      }
    }
    if (!existsSync(path)) return new Response('not found', { status: 404 })
    // Read directly into a Response. Previously we proxied through net.fetch(file://...)
    // which silently fails on WSL2 + disable-gpu (renderer never sees bytes, image stays
    // blank). Thumbs are small (~16KB) so blocking readFileSync is fine.
    const buf = readFileSync(path)
    return new Response(buf, { headers: { 'Content-Type': 'image/jpeg' } })
  })
}

export function registerThumbScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'tlx-thumb', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true } },
  ])
}
