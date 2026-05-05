import type { AIClient } from '../ai/AIClient'
import { makeDoubaoClient } from '../ai/doubaoClient'
import { makeZhipuClient } from '../ai/zhipuClient'
import { makeMockClient } from '../ai/mockClient'

let _primary: AIClient | null = null
let _fallback: AIClient | null = null

export function getPrimaryClient(): AIClient {
  if (_primary) return _primary
  if (process.env.MOCK_AI === 'true') {
    _primary = makeMockClient()
    return _primary
  }
  const key = process.env.DOUBAO_API_KEY ?? ''
  if (!key) throw new Error('DOUBAO_API_KEY not set (or use MOCK_AI=true)')
  _primary = makeDoubaoClient(key)
  return _primary
}

export function getFallbackClient(): AIClient | null {
  if (_fallback) return _fallback
  if (process.env.MOCK_AI === 'true') return null
  const key = process.env.ZHIPU_API_KEY
  if (!key) return null
  _fallback = makeZhipuClient(key)
  return _fallback
}

export function resetClients(): void {
  _primary = null
  _fallback = null
}
