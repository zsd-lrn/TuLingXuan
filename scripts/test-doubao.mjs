// Standalone smoke test for the doubao API path. Bypasses Electron / GUI entirely so
// we can verify key + model + network in WSL2 where the renderer keeps crashing.
//
// Usage:
//   DOUBAO_API_KEY=sk-... node scripts/test-doubao.mjs [image-path]
//   # or, reuse the saved settings.json:
//   node scripts/test-doubao.mjs

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import sharp from 'sharp'

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
if (!KEY) { console.error('DOUBAO_API_KEY missing (env or settings.json)'); process.exit(1) }
console.log(`Key prefix: ${KEY.slice(0, 8)}...${KEY.slice(-4)}  (length=${KEY.length})`)

const VISION_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const EMBED_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/embeddings'
const VISION_MODEL = 'doubao-1.5-vision-pro-32k-250115'
const EMBED_MODEL = 'doubao-embedding-text-240715'

const imgPath = process.argv[2] || 'tests/fixtures/images/fixture-1.jpg'
if (!existsSync(imgPath)) { console.error(`image not found: ${imgPath}`); process.exit(1) }
console.log(`Using image: ${imgPath}`)

console.log('\n[1/2] Vision call (analyzeImage path)...')
const buf = await sharp(imgPath).resize({ width: 1024, height: 1024, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()
const b64 = buf.toString('base64')
console.log(`  resized to ${buf.length} bytes`)

let t = Date.now()
const visionRes = await fetch(VISION_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: '你是图像理解助手。返回 JSON：{"caption":"一句话描述","tags":["tag1","tag2"]}' },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
        { type: 'text', text: '描述这张图片' },
      ]},
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  }),
})
console.log(`  HTTP ${visionRes.status} in ${Date.now() - t}ms`)
if (!visionRes.ok) {
  console.error(`  body: ${await visionRes.text()}`)
  process.exit(1)
}
const visionData = await visionRes.json()
console.log(`  reply: ${visionData.choices?.[0]?.message?.content}`)
console.log(`  tokens: prompt=${visionData.usage?.prompt_tokens} completion=${visionData.usage?.completion_tokens} total=${visionData.usage?.total_tokens}`)

console.log('\n[2/2] Text embedding call (embedText path)...')
t = Date.now()
const embedRes = await fetch(EMBED_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ model: EMBED_MODEL, input: ['一张测试图片，用于验证 embedding API'] }),
})
console.log(`  HTTP ${embedRes.status} in ${Date.now() - t}ms`)
if (!embedRes.ok) {
  console.error(`  body: ${await embedRes.text()}`)
  process.exit(1)
}
const embedData = await embedRes.json()
const v = embedData.data?.[0]?.embedding
console.log(`  vector dim: ${v?.length}  first 4: [${v?.slice(0, 4).map((n) => n.toFixed(4)).join(', ')}]`)

console.log('\n✓ All API paths working. doubao key + model + network are OK.')
