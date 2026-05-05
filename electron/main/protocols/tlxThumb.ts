import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { existsSync } from 'fs'
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
    return net.fetch(pathToFileURL(path).toString())
  })
}

export function registerThumbScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'tlx-thumb', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true } },
  ])
}
