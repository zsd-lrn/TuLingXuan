import { BrowserWindow } from 'electron'
import sharp from 'sharp'
import { DatabaseService } from './DatabaseService'
import { getPrimaryClient, getFallbackClient } from './AIService'
import type { AIClient } from '../ai/AIClient'

type Job = { imageId: string; path: string; hash: string; priority: number }

const CONCURRENCY = 3

export class AnalysisQueue {
  private jobs: Job[] = []
  private running = 0
  private cancelled = false
  private failureStreak = 0
  private currentClient: AIClient | null = null
  // Guard against concurrent run() calls (e.g. React StrictMode double-effect,
  // or users hitting "AI 分析" twice). Without this we'd spawn extra workers
  // racing over the same job list.
  private isRunning = false

  constructor(public projectId: string) {}

  enqueue(jobs: Job[]) {
    this.jobs.push(...jobs)
    this.jobs.sort((a, b) => b.priority - a.priority)
  }

  cancel() {
    this.cancelled = true
    this.jobs = []
  }

  private send(channel: string, payload: unknown) {
    BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(channel, payload))
  }

  private getClient(): AIClient {
    if (this.currentClient) return this.currentClient
    this.currentClient = getPrimaryClient()
    return this.currentClient
  }

  private maybeFailover() {
    if (this.failureStreak >= 5) {
      const fb = getFallbackClient()
      if (fb && this.currentClient?.name !== fb.name) {
        this.currentClient = fb
        this.failureStreak = 0
        console.warn('AnalysisQueue: failover to', fb.name)
      }
    }
  }

  async run() {
    if (this.isRunning) return
    this.isRunning = true
    this.cancelled = false
    console.log(`[AnalysisQueue] run start, project=${this.projectId}, jobs=${this.jobs.length}`)

    const total = () => DatabaseService.listPendingImages(this.projectId).length + this.running
    const send = (done: number) => this.send('ai:progress', {
      projectId: this.projectId,
      done,
      total: done + this.jobs.length + this.running,
    })

    const work = async () => {
      while (!this.cancelled && this.jobs.length) {
        const job = this.jobs.shift()!
        this.running++
        try {
          DatabaseService.setImageAIStatus(job.imageId, 'running')
          const client = this.getClient()
          const buf = await sharp(job.path)
            .resize({ width: 1024, height: 1024, fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer()
          const b64 = buf.toString('base64')
          const analysis = await client.analyzeImage({ imageBase64: b64, hash: job.hash })
          const tags = [
            ...analysis.tags.style.map((v) => ({ category: 'style' as const, value: v })),
            ...analysis.tags.subject.map((v) => ({ category: 'subject' as const, value: v })),
            ...analysis.tags.mood.map((v) => ({ category: 'mood' as const, value: v })),
            ...analysis.tags.palette.map((v) => ({ category: 'palette' as const, value: v })),
            ...analysis.tags.issue.map((v) => ({ category: 'issue' as const, value: v })),
          ]
          DatabaseService.saveAIAnalysis({
            imageId: job.imageId,
            qualityScore: analysis.quality_score,
            aestheticScore: analysis.aesthetic_score,
            caption: analysis.caption,
            promptGuess: analysis.prompt_guess,
            tags,
          })
          // also embed
          const embedSrc = analysis.caption + ' | ' + tags.map((t) => t.value).join(' ')
          try {
            const v = await client.embedText(embedSrc)
            DatabaseService.saveEmbedding(job.imageId, v)
          } catch {
            // embedding failure non-fatal
          }
          this.failureStreak = 0
          DatabaseService.refreshCovers(this.projectId)
          this.send('ai:image-updated', { imageId: job.imageId })
        } catch (e: unknown) {
          this.failureStreak++
          const msg = e instanceof Error ? e.message : String(e)
          DatabaseService.setImageAIStatus(job.imageId, 'error', msg)
          this.send('ai:image-updated', { imageId: job.imageId })
          this.maybeFailover()
          // re-enqueue if failover happened so the image gets retried with new client
        } finally {
          this.running--
        }
        const done = total() - this.jobs.length - this.running
        send(done)
      }
    }
    try {
      await Promise.all(Array.from({ length: CONCURRENCY }, () => work()))
      console.log(`[AnalysisQueue] run done, project=${this.projectId}`)
    } finally {
      this.isRunning = false
    }
  }
}

const queues = new Map<string, AnalysisQueue>()

export function getOrCreateQueue(projectId: string): AnalysisQueue {
  let q = queues.get(projectId)
  if (!q) {
    q = new AnalysisQueue(projectId)
    queues.set(projectId, q)
  }
  return q
}

export function cancelQueue(projectId: string): void {
  queues.get(projectId)?.cancel()
  queues.delete(projectId)
}
