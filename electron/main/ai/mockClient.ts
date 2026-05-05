import type { AIClient } from './AIClient'
import type { AIAnalysis } from '@shared/types'
import canned from '../../../tests/fixtures/ai-responses/canned.json'

function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length]! }
function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const out: T[] = []
  for (let i = 0; i < n; i++) out.push(arr[(seed + i * 17) % arr.length]!)
  return Array.from(new Set(out))
}

export function makeMockClient(): AIClient {
  return {
    name: 'mock',
    async analyzeImage({ hash }) {
      const seed = parseInt(hash.slice(0, 6), 16)
      await new Promise((r) => setTimeout(r, 50 + (seed % 250)))
      const a: AIAnalysis = {
        quality_score: 30 + (seed % 70),
        aesthetic_score: 20 + ((seed * 7) % 75),
        tags: {
          style:   pickN(canned.tagsBank.style, 1 + (seed % 2), seed),
          subject: pickN(canned.tagsBank.subject, 1, seed >> 2),
          mood:    pickN(canned.tagsBank.mood, 1 + (seed % 2), seed >> 3),
          palette: pickN(canned.tagsBank.palette, 1, seed >> 4),
          issue:   [pick(canned.tagsBank.issue, seed >> 5)],
        },
        caption: pick(canned.captions, seed),
        prompt_guess: 'cinematic portrait, soft warm light, shallow depth of field',
      }
      return a
    },
    async embedText(text) {
      // deterministic faux embedding (1024 dim)
      const v = new Float32Array(1024)
      let h = 0
      for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
      for (let i = 0; i < 1024; i++) {
        h = (h * 1103515245 + 12345) >>> 0
        v[i] = ((h & 0xffff) / 0xffff) - 0.5
      }
      // l2 normalize
      let n = 0; for (let i = 0; i < v.length; i++) n += v[i]! * v[i]!
      n = Math.sqrt(n) || 1
      for (let i = 0; i < v.length; i++) v[i]! /= n
      return v
    },
    async summarizeCluster({ imagesBase64 }) {
      return `${imagesBase64.length} 张相似风格图片`
    },
    async compareImages({ imagesBase64 }) {
      return `共 ${imagesBase64.length} 张图。共同点：构图相近、色彩接近。建议优先选第 1 张，因综合质量分最高。`
    },
    async rewritePrompts() {
      return [
        'cinematic portrait, golden hour, shallow depth of field, soft skin tones',
        'editorial photography, warm cafe ambient, blurred background',
        'natural light portrait, side profile, film grain, muted palette',
      ]
    },
  }
}
