import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { ThumbnailService } from '../services/ThumbnailService'

export function registerThumbProtocol() {
  protocol.handle('tlx-thumb', (req) => {
    const url = new URL(req.url)
    const hash = url.hostname || url.pathname.replace(/^\/+/, '')
    const path = ThumbnailService.thumbPath(hash)
    return net.fetch(pathToFileURL(path).toString())
  })
}

export function registerThumbScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'tlx-thumb', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true } },
  ])
}
