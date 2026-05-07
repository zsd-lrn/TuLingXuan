import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { aiCacheDir } from '../util/paths'
import { SYSTEM_PROMPT_ANALYZE, ANALYZE_JSON_SCHEMA, PROMPT_VERSION,
         PROMPT_CLUSTER_SUMMARY, PROMPT_COMPARE, PROMPT_REWRITE } from './prompts'
import { parseAnalysisResponse } from './parseResponse'
import { withRetry } from './retry'
import type { AIClient } from './AIClient'
import type { AIAnalysis } from '@shared/types'

const ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const EMBED_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/embeddings'
const VISION_MODEL = 'doubao-1.5-vision-pro-32k-250115'
const TEXT_MODEL = 'doubao-1.5-pro-32k-250115'
const EMBED_MODEL = 'doubao-embedding-text-240715'

function readBase64(path: string): string {
  const b = readFileSync(path)
  return b.toString('base64')
}

function cachePath(hash: string): string {
  return join(aiCacheDir(), `${hash}-${PROMPT_VERSION}.json`)
}

export function makeDoubaoClient(apiKey: string): AIClient {
  if (!apiKey) throw new Error('DOUBAO_API_KEY missing')

  async function chat(body: any): Promise<any> {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`doubao ${res.status}: ${await res.text()}`)
    return res.json()
  }

  async function analyzeImage({ imageBase64, hash }: { imageBase64: string; hash: string }): Promise<AIAnalysis> {
    const cp = cachePath(hash)
    if (existsSync(cp)) {
      try { return JSON.parse(readFileSync(cp, 'utf-8')) } catch {}
    }

    const result = await withRetry(async () => {
      const resp = await chat({
        model: VISION_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_ANALYZE },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: '请按 schema 返回 JSON。' },
          ]},
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })
      const text = resp.choices?.[0]?.message?.content ?? ''
      const parsed = parseAnalysisResponse(text)
      if (parsed.ok) return parsed.data
      // 1 retry inside the fn already; rely on outer retry
      throw new Error('parse failed: ' + parsed.error)
    })

    writeFileSync(cp, JSON.stringify(result))
    return result
  }

  async function embedText(text: string): Promise<Float32Array> {
    const res = await withRetry(() => fetch(EMBED_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: [text] }),
    }).then(async (r): Promise<any> => {
      if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`)
      return r.json()
    }))
    const v = res.data?.[0]?.embedding as number[] | undefined
    if (!v) throw new Error('embedding missing')
    return new Float32Array(v)
  }

  async function summarizeCluster({ imagesBase64 }: { imagesBase64: string[] }): Promise<string> {
    const resp = await chat({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: PROMPT_CLUSTER_SUMMARY },
        { role: 'user', content: imagesBase64.map((b) => ({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b}` } })) },
      ],
      temperature: 0.3, max_tokens: 80,
    })
    return (resp.choices?.[0]?.message?.content ?? '').trim()
  }

  async function compareImages({ imagesBase64, metadata }: { imagesBase64: string[]; metadata: string }): Promise<string> {
    const resp = await chat({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: PROMPT_COMPARE },
        { role: 'user', content: [
          ...imagesBase64.map((b) => ({ type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${b}` } })),
          { type: 'text' as const, text: '已有元数据：\n' + metadata },
        ]},
      ],
      temperature: 0.4, max_tokens: 400,
    })
    return (resp.choices?.[0]?.message?.content ?? '').trim()
  }

  async function rewritePrompts({ metadata }: { metadata: string }): Promise<string[]> {
    const resp = await chat({
      model: TEXT_MODEL,
      messages: [{ role: 'system', content: PROMPT_REWRITE }, { role: 'user', content: metadata }],
      temperature: 0.5, max_tokens: 300,
    })
    const txt = resp.choices?.[0]?.message?.content ?? ''
    return txt.split(/\n+/).map((s: string) => s.replace(/^[-\d.\s]+/, '').trim()).filter(Boolean).slice(0, 3)
  }

  async function extractSearchKeywords(query: string): Promise<string[]> {
    const resp = await chat({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: '把用户的图片搜索查询拆成 1-5 个核心中文关键词，用于在图片标签和描述中搜索。返回 JSON：{"keywords":["关键词1","关键词2"]}。不要任何其他文字。' },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, max_tokens: 100,
    })
    const txt = resp.choices?.[0]?.message?.content ?? '{}'
    try {
      const parsed = JSON.parse(txt)
      const list = Array.isArray(parsed) ? parsed : (parsed.keywords ?? parsed.tags ?? [])
      const out = (list as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      if (out.length) return out.slice(0, 8)
    } catch { /* fall through */ }
    // Last-resort: just use the whole query as a single keyword
    return [query.trim()].filter(Boolean)
  }

  return { name: 'doubao', analyzeImage, embedText, summarizeCluster, compareImages, rewritePrompts, extractSearchKeywords }
}

export { readBase64 }
