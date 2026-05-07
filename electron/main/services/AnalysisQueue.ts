import { BrowserWindow } from 'electron'
import sharp from 'sharp'
import { DatabaseService } from './DatabaseService'
import { getPrimaryClient, getFallbackClient } from './AIService'
import type { AIClient } from '../ai/AIClient'

type Job = { imageId: string; path: string; hash: string; priority: number }

const CONCURRENCY_CAP = 3
const CONCURRENCY_MIN = 1
// Adaptive throttle: when we hit a 429/rate-limit response, drop concurrency to
// the floor; after this many consecutive successes, step it back up by one.
// This is generous because doubao's RPM limits are soft and rare to hit, but
// without this a flood of retries on a real 429 would just keep getting
// rejected. Generation/serving systems care about this — interview signal.
const RECOVERY_STREAK = 8

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
  // Adaptive concurrency state
  private concurrency = CONCURRENCY_CAP
  private successStreak = 0
  // Track which images each worker is currently processing for UI highlight.
  // Use a Set so progress events can flush a stable list of "currently running".
  private currentImageIds = new Set<string>()

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

  // Detect rate-limit / overload so we can throttle. doubao surfaces RPM caps as
  // HTTP 429; some routes return 503 / quota messages instead.
  private isRateLimit(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err)
    return /\b(429|503)\b/.test(msg) || /rate.?limit|too many|quota|过快|限流/i.test(msg)
  }

  private throttleDown() {
    if (this.concurrency > CONCURRENCY_MIN) {
      this.concurrency--
      this.successStreak = 0
      console.warn(`[AnalysisQueue] rate limit detected, concurrency -> ${this.concurrency}`)
    }
  }

  private throttleUp() {
    this.successStreak++
    if (this.successStreak >= RECOVERY_STREAK && this.concurrency < CONCURRENCY_CAP) {
      this.concurrency++
      this.successStreak = 0
      console.log(`[AnalysisQueue] recovered, concurrency -> ${this.concurrency}`)
    }
  }

  async run() {
    if (this.isRunning) return
    this.isRunning = true
    this.cancelled = false
    console.log(`[AnalysisQueue] run start, project=${this.projectId}, jobs=${this.jobs.length}, concurrency=${this.concurrency}`)

    const total = () => DatabaseService.listPendingImages(this.projectId).length + this.running
    const sendProgress = (done: number) => this.send('ai:progress', {
      projectId: this.projectId,
      done,
      total: done + this.jobs.length + this.running,
      currentImageIds: [...this.currentImageIds],
    })

    const work = async () => {
      while (!this.cancelled && this.jobs.length) {
        // Honor dynamic concurrency: if we throttled down mid-run, extra workers
        // exit early instead of all racing to the next job.
        if (this.running >= this.concurrency) {
          await new Promise((r) => setTimeout(r, 200))
          continue
        }
        const job = this.jobs.shift()!
        this.running++
        this.currentImageIds.add(job.imageId)
        sendProgress(total() - this.jobs.length - this.running)
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
          this.throttleUp()
          DatabaseService.refreshCovers(this.projectId)
          this.send('ai:image-updated', { imageId: job.imageId })
        } catch (e: unknown) {
          this.failureStreak++
          if (this.isRateLimit(e)) this.throttleDown()
          const msg = e instanceof Error ? e.message : String(e)
          DatabaseService.setImageAIStatus(job.imageId, 'error', msg)
          this.send('ai:image-updated', { imageId: job.imageId })
          this.maybeFailover()
        } finally {
          this.running--
          this.currentImageIds.delete(job.imageId)
        }
        sendProgress(total() - this.jobs.length - this.running)
      }
    }
    try {
      // Spawn up to the cap; throttleDown only changes how many actually run
      // a job at any given moment (extras spin in the running>=concurrency check).
      await Promise.all(Array.from({ length: CONCURRENCY_CAP }, () => work()))
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
