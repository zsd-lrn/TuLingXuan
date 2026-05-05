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
}
