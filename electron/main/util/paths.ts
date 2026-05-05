import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

export function userDataPath(...segments: string[]): string {
  const root = app.getPath('userData')
  const full = join(root, ...segments)
  return full
}

export function ensureDir(path: string): string {
  mkdirSync(path, { recursive: true })
  return path
}

export const dbPath = () => userDataPath('tulingxuan.db')
export const thumbsDir = () => ensureDir(userDataPath('thumbs'))
export const aiCacheDir = () => ensureDir(userDataPath('cache', 'ai'))
export const logsDir = () => ensureDir(userDataPath('logs'))
