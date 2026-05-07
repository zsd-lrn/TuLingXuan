import { ipcMain, app } from 'electron'
import { existsSync, readFileSync, writeFileSync, statSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { thumbsDir, aiCacheDir } from '../util/paths'
import { resetClients } from '../services/AIService'

const settingsFile = () => join(app.getPath('userData'), 'settings.json')

type Settings = { doubaoKey: string; zhipuKey: string; mockMode: boolean }

function load(): Settings {
  const f = settingsFile()
  if (existsSync(f)) {
    try { return { doubaoKey: '', zhipuKey: '', mockMode: false, ...JSON.parse(readFileSync(f, 'utf-8')) } } catch {}
  }
  return {
    doubaoKey: process.env.DOUBAO_API_KEY ?? '',
    zhipuKey: process.env.ZHIPU_API_KEY ?? '',
    mockMode: process.env.MOCK_AI === 'true',
  }
}

function save(s: Settings) {
  writeFileSync(settingsFile(), JSON.stringify(s, null, 2))
  process.env.DOUBAO_API_KEY = s.doubaoKey
  process.env.ZHIPU_API_KEY = s.zhipuKey
  process.env.MOCK_AI = s.mockMode ? 'true' : 'false'
  resetClients()
}

function dirSize(dir: string): number {
  if (!existsSync(dir)) return 0
  let total = 0
  for (const f of readdirSync(dir)) {
    try { total += statSync(join(dir, f)).size } catch {}
  }
  return total
}

export function registerSettingsIPC() {
  // Load on startup so cached keys are honored
  const s = load()
  process.env.DOUBAO_API_KEY = s.doubaoKey
  process.env.ZHIPU_API_KEY = s.zhipuKey
  process.env.MOCK_AI = s.mockMode ? 'true' : 'false'

  ipcMain.handle('settings.get', () => load())
  ipcMain.handle('settings.set', (_e, payload: Settings) => save(payload))
  ipcMain.handle('settings.cacheStats', () => ({
    thumbnails: dirSize(thumbsDir()),
    aiCache: dirSize(aiCacheDir()),
  }))
  ipcMain.handle('settings.clearCache', () => {
    for (const f of readdirSync(thumbsDir())) try { unlinkSync(join(thumbsDir(), f)) } catch {}
    for (const f of readdirSync(aiCacheDir())) try { unlinkSync(join(aiCacheDir(), f)) } catch {}
  })

  // Smoke-test the doubao key with a tiny 5-token chat call. Lets the user
  // verify config without burning vision tokens or polluting the AI cache.
  ipcMain.handle('settings.testConnection', async (_e, payload: { doubaoKey?: string }) => {
    const key = payload?.doubaoKey ?? process.env.DOUBAO_API_KEY ?? ''
    if (!key) return { ok: false, elapsedMs: 0, error: 'no key configured' }
    const start = Date.now()
    try {
      const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'doubao-1.5-pro-32k-250115',
          messages: [{ role: 'user', content: '回复 OK' }],
          max_tokens: 5,
          temperature: 0,
        }),
        signal: AbortSignal.timeout(15000),
      })
      const elapsedMs = Date.now() - start
      if (!res.ok) {
        const txt = await res.text()
        return { ok: false, elapsedMs, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` }
      }
      return { ok: true, elapsedMs }
    } catch (e) {
      return { ok: false, elapsedMs: Date.now() - start, error: (e as Error).message }
    }
  })
}
