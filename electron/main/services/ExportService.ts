import { copyFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, parse } from 'path'

export function generateCSV(images: any[]): string {
  const header = 'filename,user_status,user_score,ai_quality,ai_aesthetic,ai_caption,ai_prompt_guess,tags'
  function esc(v: any): string {
    if (v == null) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }
  const rows = images.map((i) => [
    i.filename,
    i.userStatus ?? '',
    i.userScore ?? '',
    i.aiQualityScore ?? '',
    i.aiAestheticScore ?? '',
    i.aiCaption ?? '',
    i.aiPromptGuess ?? '',
    (i.tags ?? []).map((t: any) => `${t.category}:${t.value}`).join(';'),
  ].map(esc).join(','))
  return [header, ...rows].join('\n')
}

export async function copyImages(items: { path: string; filename: string }[], targetDir: string): Promise<{ copied: number }> {
  await mkdir(targetDir, { recursive: true })
  let copied = 0
  for (const item of items) {
    let dest = join(targetDir, item.filename)
    if (existsSync(dest)) {
      const { name, ext } = parse(item.filename)
      let n = 1
      while (existsSync(join(targetDir, `${name}-${n}${ext}`))) n++
      dest = join(targetDir, `${name}-${n}${ext}`)
    }
    await copyFile(item.path, dest)
    copied++
  }
  return { copied }
}
