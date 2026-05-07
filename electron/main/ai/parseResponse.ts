import { AIAnalysisSchema, type AIAnalysis } from '@shared/types'

export type ParseResult =
  | { ok: true; data: AIAnalysis }
  | { ok: false; fallback: AIAnalysis; error: string }

const FALLBACK: AIAnalysis = {
  quality_score: 50,
  aesthetic_score: 50,
  tags: { style: [], subject: [], mood: [], palette: [], issue: ['无'] },
  caption: '',
  prompt_guess: '',
}

function stripFences(s: string): string {
  return s.replace(/```json\s*/g, '').replace(/```/g, '').trim()
}

function extractJSON(s: string): string {
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a >= 0 && b > a) return s.slice(a, b + 1)
  return s
}

const TAG_KEYS = ['style', 'subject', 'mood', 'palette', 'issue'] as const

function arrayify(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean)
  if (typeof v === 'string' && v) return [v]
  return []
}

// doubao consistently flattens the 5 tag categories to top-level instead of nesting
// them under `tags`, even when the system prompt is explicit. Real example response:
//   { "quality_score": 0, "style": [], "subject": [], "mood": [], "palette": ["暖色调"],
//     "issue": ["无"], "caption": "...", "prompt_guess": "..." }
// Lift those keys back into `tags` before Zod validation.
function normalize(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const o = input as Record<string, unknown>
  const tagsExisting = o.tags && typeof o.tags === 'object' && !Array.isArray(o.tags)
    ? (o.tags as Record<string, unknown>)
    : null
  const flattened = TAG_KEYS.some((k) => k in o)
  if (!tagsExisting || flattened) {
    const tags: Record<string, string[]> = {}
    for (const k of TAG_KEYS) {
      const arr = arrayify(tagsExisting?.[k] ?? o[k])
      tags[k] = k === 'issue' && !arr.length ? ['无'] : arr
      delete o[k]
    }
    o.tags = tags
  } else {
    // nested but possibly missing some sub-keys
    for (const k of TAG_KEYS) {
      const arr = arrayify(tagsExisting[k])
      tagsExisting[k] = k === 'issue' && !arr.length ? ['无'] : arr
    }
  }
  // numeric scores sometimes come as strings
  if (typeof o.quality_score === 'string') o.quality_score = Number(o.quality_score) || 50
  if (typeof o.aesthetic_score === 'string') o.aesthetic_score = Number(o.aesthetic_score) || 50
  o.caption = String(o.caption ?? '')
  o.prompt_guess = String(o.prompt_guess ?? '')
  return o
}

export function parseAnalysisResponse(raw: string): ParseResult {
  let txt = stripFences(raw)
  txt = extractJSON(txt)
  let parsed: unknown
  try { parsed = JSON.parse(txt) }
  catch (e) { return { ok: false, fallback: FALLBACK, error: 'json-parse: ' + (e as Error).message } }

  parsed = normalize(parsed)
  const v = AIAnalysisSchema.safeParse(parsed)
  if (!v.success) return { ok: false, fallback: FALLBACK, error: v.error.message }
  return { ok: true, data: v.data }
}
