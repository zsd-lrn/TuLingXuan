import { protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import { DatabaseService } from '../services/DatabaseService'

export function registerImageProtocol() {
  protocol.handle('tlx-image', (req) => {
    const url = new URL(req.url)
    const id = url.hostname || url.pathname.replace(/^\/+/, '')
    const img = DatabaseService.getImage(id)
    if (!img) return new Response('not found', { status: 404 })
    return net.fetch(pathToFileURL(img.path).toString())
  })
}

export function registerImageScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'tlx-image', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } },
  ])
}
