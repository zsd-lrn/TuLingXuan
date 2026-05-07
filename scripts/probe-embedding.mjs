// Probe which embedding model is actually accessible on the user's doubao account.
// The hard-coded `doubao-embedding-text-240715` returns 404, so we walk through the
// known names and report the first one that works.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

function loadKey() {
  if (process.env.DOUBAO_API_KEY) return process.env.DOUBAO_API_KEY
  const settings = join(homedir(), '.config/tulingxuan/settings.json')
  if (existsSync(settings)) {
    try {
      const s = JSON.parse(readFileSync(settings, 'utf-8'))
      if (s.doubaoKey) return s.doubaoKey
    } catch {}
  }
  return null
}

const KEY = loadKey()
if (!KEY) { console.error('DOUBAO_API_KEY missing'); process.exit(1) }

const ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/embeddings'

// Volcengine Ark text embedding models (chronological, newer first).
// Names follow `doubao-embedding-[size-]text-YYMMDD` pattern.
const CANDIDATES = [
  'doubao-embedding-text-240715',
  'doubao-embedding-large-text-240915',
  'doubao-embedding-large-text-250515',
  'doubao-embedding-vision-241215',
  'doubao-embedding',
]

for (const model of CANDIDATES) {
  process.stdout.write(`${model.padEnd(40)} ... `)
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model, input: ['hello'] }),
  })
  if (r.ok) {
    const j = await r.json()
    const dim = j.data?.[0]?.embedding?.length
    console.log(`✓ HTTP 200, dim=${dim}`)
  } else {
    const txt = (await r.text()).slice(0, 120).replace(/\s+/g, ' ')
    console.log(`✗ HTTP ${r.status}  ${txt}`)
  }
}
