import type { AIClient } from './AIClient'
import { SYSTEM_PROMPT_ANALYZE, PROMPT_CLUSTER_SUMMARY, PROMPT_COMPARE, PROMPT_REWRITE } from './prompts'
import { parseAnalysisResponse } from './parseResponse'
import { withRetry } from './retry'
import type { AIAnalysis } from '@shared/types'

const ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

export function makeZhipuClient(apiKey: string): AIClient {
  if (!apiKey) throw new Error('ZHIPU_API_KEY missing')

  async function chat(body: any) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`zhipu ${res.status}: ${await res.text()}`)
    return res.json() as Promise<any>
  }

  async function analyzeImage({ imageBase64 }: { imageBase64: string; hash: string }): Promise<AIAnalysis> {
    const result = await withRetry(async () => {
      const resp = await chat({
        model: 'glm-4v-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_ANALYZE },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: '请只输出 JSON。' },
          ]},
        ],
        temperature: 0.2,
      })
      const text = resp.choices?.[0]?.message?.content ?? ''
      const parsed = parseAnalysisResponse(text)
      if (parsed.ok) return parsed.data
      throw new Error('parse failed')
    })
    return result
  }

  async function embedText(): Promise<Float32Array> {
    throw new Error('zhipu embedding not used; doubao primary')
  }

  async function summarizeCluster({ imagesBase64 }: { imagesBase64: string[] }): Promise<string> {
    const resp = await chat({
      model: 'glm-4v-flash',
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
      model: 'glm-4v-flash',
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
      model: 'glm-4-flash',
      messages: [{ role: 'system', content: PROMPT_REWRITE }, { role: 'user', content: metadata }],
      temperature: 0.5, max_tokens: 300,
    })
    const txt = resp.choices?.[0]?.message?.content ?? ''
    return txt.split(/\n+/).map((s: string) => s.replace(/^[-\d.\s]+/, '').trim()).filter(Boolean).slice(0, 3)
  }

  return { name: 'zhipu', analyzeImage, embedText, summarizeCluster, compareImages, rewritePrompts }
}
