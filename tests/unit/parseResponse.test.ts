import { describe, it, expect } from 'vitest'
import { parseAnalysisResponse } from '@main/ai/parseResponse'

describe('parseAnalysisResponse', () => {
  it('parses valid JSON', () => {
    const r = parseAnalysisResponse(JSON.stringify({
      quality_score: 80, aesthetic_score: 65,
      tags: { style: ['写实'], subject: ['人像'], mood: ['温暖'], palette: ['暖色调'], issue: ['无'] },
      caption: '黄昏窗边人像', prompt_guess: 'portrait warm sunset'
    }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.quality_score).toBe(80)
      expect(r.data.tags.style).toEqual(['写实'])
    }
  })

  it('strips markdown fences and parses', () => {
    const wrapped = '```json\n{"quality_score":50,"aesthetic_score":50,"tags":{"style":[],"subject":[],"mood":[],"palette":[],"issue":[]},"caption":"x","prompt_guess":"x"}\n```'
    const r = parseAnalysisResponse(wrapped)
    expect(r.ok).toBe(true)
  })

  it('returns conservative default on bad JSON', () => {
    const r = parseAnalysisResponse('not json at all')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.fallback.quality_score).toBe(50)
      expect(r.fallback.tags.issue).toEqual(['无'])
    }
  })

  it('returns fallback when schema invalid', () => {
    const r = parseAnalysisResponse(JSON.stringify({ quality_score: 200, aesthetic_score: -5, tags: {}, caption: '', prompt_guess: '' }))
    expect(r.ok).toBe(false)
  })

  it('clamps clamped numbers', () => {
    // we accept 0-100; 200 fails. fallback is used.
    const r = parseAnalysisResponse(JSON.stringify({ quality_score: 105 }))
    expect(r.ok).toBe(false)
  })
})
