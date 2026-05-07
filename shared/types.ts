import { z } from 'zod'

// ── Project ───────────────────────────────────────
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceDir: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  imageCount: z.number().default(0),
  decidedCount: z.number().default(0),
  aiAnalyzedCount: z.number().default(0),
  coverHashes: z.array(z.string()).max(4).default([]),
})
export type Project = z.infer<typeof ProjectSchema>

// ── Image ─────────────────────────────────────────
export const UserStatusSchema = z.enum(['good', 'bad', 'maybe']).nullable()
export type UserStatus = z.infer<typeof UserStatusSchema>

export const AIStatusSchema = z.enum(['pending', 'running', 'done', 'error'])
export type AIStatus = z.infer<typeof AIStatusSchema>

export const TagCategorySchema = z.enum(['style', 'subject', 'mood', 'palette', 'issue'])
export type TagCategory = z.infer<typeof TagCategorySchema>

export const TagSchema = z.object({
  category: TagCategorySchema,
  value: z.string(),
})
export type Tag = z.infer<typeof TagSchema>

export const ImageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  path: z.string(),
  filename: z.string(),
  hash: z.string(),
  sizeBytes: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  importedAt: z.number(),
  // ai
  aiStatus: AIStatusSchema,
  aiQualityScore: z.number().nullable(),
  aiAestheticScore: z.number().nullable(),
  aiCaption: z.string().nullable(),
  aiPromptGuess: z.string().nullable(),
  aiClusterId: z.number().nullable(),
  aiError: z.string().nullable(),
  aiAnalyzedAt: z.number().nullable(),
  // user
  userStatus: UserStatusSchema,
  userScore: z.number().int().min(1).max(5).nullable(),
  userNote: z.string().nullable(),
  decidedAt: z.number().nullable(),
  // joined
  tags: z.array(TagSchema).default([]),
})
export type Image = z.infer<typeof ImageSchema>

// ── AI analysis output (what the model returns) ──
export const AIAnalysisSchema = z.object({
  quality_score: z.number().min(0).max(100),
  aesthetic_score: z.number().min(0).max(100),
  tags: z.object({
    style: z.array(z.string()),
    subject: z.array(z.string()),
    mood: z.array(z.string()),
    palette: z.array(z.string()),
    issue: z.array(z.string()),
  }),
  caption: z.string(),
  prompt_guess: z.string(),
})
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>

// ── Cluster ───────────────────────────────────────
export const ClusterSchema = z.object({
  projectId: z.string(),
  id: z.number(),
  representativeImageId: z.string(),
  size: z.number(),
  summary: z.string().nullable(),
  imageIds: z.array(z.string()).default([]),
})
export type Cluster = z.infer<typeof ClusterSchema>

// ── Image query params ───────────────────────────
export const ImageQueryParamsSchema = z.object({
  projectId: z.string(),
  filters: z.object({
    status: z.array(z.union([UserStatusSchema, z.literal('undecided')])).optional(),
    scoreRange: z.tuple([z.number(), z.number()]).optional(),
    qualityRange: z.tuple([z.number(), z.number()]).optional(),
    aestheticRange: z.tuple([z.number(), z.number()]).optional(),
    tags: z.array(TagSchema).optional(),
    clusterId: z.number().nullable().optional(),
    naturalLanguageIds: z.array(z.string()).optional(), // pre-resolved by NL search
  }).default({}),
  sort: z.enum(['imported', 'quality', 'aesthetic', 'score']).default('imported'),
  cursor: z.number().nullable().default(null),
  limit: z.number().default(200),
})
export type ImageQueryParams = z.infer<typeof ImageQueryParamsSchema>

// ── IPC events ────────────────────────────────────
export type AIProgressEvent = {
  projectId: string
  done: number
  total: number
  currentImageIds?: string[]   // image ids being analyzed right now (for UI highlight)
}

export type AIImageUpdatedEvent = { imageId: string }

export type ImportProgressEvent = {
  projectId: string
  done: number
  total: number
}
