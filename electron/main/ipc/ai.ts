import { ipcMain } from 'electron'
import sharp from 'sharp'
import { DatabaseService } from '../services/DatabaseService'
import { getOrCreateQueue, cancelQueue } from '../services/AnalysisQueue'
import { getPrimaryClient } from '../services/AIService'
import type { Image } from '@shared/types'

export function registerAIIPC() {
  ipcMain.handle('ai.start', async (_e, projectId: string) => {
    const pending = DatabaseService.listPendingImages(projectId)
    const q = getOrCreateQueue(projectId)
    q.enqueue(pending.map((p, idx) => ({ imageId: p.id, path: p.path, hash: p.hash, priority: 100 - idx })))
    q.run().catch(console.error) // fire and forget
    return { enqueued: pending.length }
  })

  ipcMain.handle('ai.cancel', async (_e, projectId: string) => {
    cancelQueue(projectId)
  })

  ipcMain.handle('ai.suggestPrompt', async (_e, imageId: string) => {
    const img = DatabaseService.getImage(imageId)
    return img?.aiPromptGuess ?? null
  })

  ipcMain.handle('ai.compare', async (_e, imageIds: string[]) => {
    const imgs = imageIds.map((id) => DatabaseService.getImage(id)).filter((x): x is Image => x !== null)
    if (imgs.length < 2) throw new Error('need at least 2 images')
    const client = getPrimaryClient()
    const imagesBase64 = await Promise.all(imgs.map(async (i) => {
      const buf = await sharp(i.path)
        .resize({ width: 1024, height: 1024, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer()
      return buf.toString('base64')
    }))
    const metadata = imgs.map((i, idx) =>
      `图${idx + 1}: 质量${i.aiQualityScore ?? '-'}/美学${i.aiAestheticScore ?? '-'}; 标签 ${i.tags.map((t) => t.value).join(',')}`,
    ).join('\n')
    const summary = await client.compareImages({ imagesBase64, metadata })
    return { summary }
  })

  ipcMain.handle('ai.nlSearch', async (_e, payload: { projectId: string; query: string }) => {
    const client = getPrimaryClient()

    // Path 1: embedding-based semantic search (preferred). Requires the user's
    // doubao account to have an embedding endpoint provisioned.
    try {
      const qv = await client.embedText(payload.query)
      const all = DatabaseService.loadEmbeddingsForProject(payload.projectId)
      if (all.length > 0) {
        const cos = (a: Float32Array, b: Float32Array) => {
          let s = 0
          const n = Math.min(a.length, b.length)
          for (let i = 0; i < n; i++) s += a[i]! * b[i]!
          return s
        }
        const scored = all.map((e) => ({ id: e.id, score: cos(qv, e.vector) }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 60)
          .map((s) => s.id)
        return { ids: scored, mode: 'embedding' }
      }
      // No embeddings stored — fall through to keyword search
    } catch (e) {
      console.warn('[ai.nlSearch] embedding path failed, falling back to keyword:', (e as Error).message)
    }

    // Path 2: LLM extracts keywords → SQL LIKE on caption + filename + tag values.
    // Worse precision than vector search, but degrades gracefully when embedding
    // isn't available (a common state on locked-down doubao accounts).
    const keywords = await client.extractSearchKeywords(payload.query)
    const ids = DatabaseService.searchByKeywords(payload.projectId, keywords)
    console.log(`[ai.nlSearch] keyword fallback: query="${payload.query}" keywords=[${keywords.join(',')}] matched=${ids.length}`)
    // Empty ids must still apply as a filter — without this, the renderer's
    // queryImages WHERE clause skips the filter and shows ALL images, making
    // it look like search "didn't do anything". Use a sentinel id that never
    // matches so the result is an explicit zero-row set.
    if (ids.length === 0) return { ids: ['__no_match__'], mode: 'keyword', keywords, matched: 0 }
    return { ids, mode: 'keyword', keywords, matched: ids.length }
  })

  ipcMain.handle('ai.rewritePrompts', async (_e, imageIds: string[]) => {
    const imgs = imageIds.map((id) => DatabaseService.getImage(id)).filter((x): x is Image => x !== null)
    if (imgs.length < 1) throw new Error('need at least 1 image')
    const client = getPrimaryClient()
    const metadata = imgs.map((i, idx) =>
      `图${idx + 1}:\n  caption: ${i.aiCaption ?? '-'}\n  tags: ${i.tags.map((t) => `${t.category}:${t.value}`).join(', ')}\n  prompt_guess: ${i.aiPromptGuess ?? '-'}`,
    ).join('\n\n')
    const prompts = await client.rewritePrompts({ metadata })
    return { prompts }
  })
}
