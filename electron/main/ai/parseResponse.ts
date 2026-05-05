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

export function parseAnalysisResponse(raw: string): ParseResult {
  let txt = stripFences(raw)
  txt = extractJSON(txt)
  let parsed: unknown
  try { parsed = JSON.parse(txt) }
  catch (e) { return { ok: false, fallback: FALLBACK, error: 'json-parse: ' + (e as Error).message } }

  const v = AIAnalysisSchema.safeParse(parsed)
  if (!v.success) return { ok: false, fallback: FALLBACK, error: v.error.message }
  return { ok: true, data: v.data }
}
