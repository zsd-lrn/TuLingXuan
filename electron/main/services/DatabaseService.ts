import { getDB } from '../db/connection'
import type { Project, Image, Tag, Cluster, ImageQueryParams, UserStatus, AIStatus } from '@shared/types'
import { randomUUID } from 'crypto'

type ImageRow = {
  id: string; project_id: string; path: string; filename: string; hash: string
  size_bytes: number | null; width: number | null; height: number | null
  imported_at: number
  ai_status: AIStatus; ai_quality_score: number | null; ai_aesthetic_score: number | null
  ai_caption: string | null; ai_prompt_guess: string | null; ai_embedding: Buffer | null
  ai_cluster_id: number | null; ai_error: string | null; ai_analyzed_at: number | null
  user_status: UserStatus; user_score: number | null; user_note: string | null; decided_at: number | null
}

function rowToImage(row: ImageRow, tags: Tag[] = []): Image {
  return {
    id: row.id, projectId: row.project_id, path: row.path, filename: row.filename, hash: row.hash,
    sizeBytes: row.size_bytes, width: row.width, height: row.height, importedAt: row.imported_at,
    aiStatus: row.ai_status,
    aiQualityScore: row.ai_quality_score, aiAestheticScore: row.ai_aesthetic_score,
    aiCaption: row.ai_caption, aiPromptGuess: row.ai_prompt_guess,
    aiClusterId: row.ai_cluster_id, aiError: row.ai_error, aiAnalyzedAt: row.ai_analyzed_at,
    userStatus: row.user_status, userScore: row.user_score, userNote: row.user_note,
    decidedAt: row.decided_at, tags,
  }
}

export const DatabaseService = {
  // ── Projects ─────────────────────────────────
  createProject(input: { name: string; sourceDir: string }): Project {
    const id = randomUUID()
    const now = Date.now()
    getDB().prepare(
      `INSERT INTO projects(id, name, source_dir, created_at, updated_at) VALUES (?,?,?,?,?)`,
    ).run(id, input.name, input.sourceDir, now, now)
    return this.getProject(id)!
  },

  getProject(id: string): Project | null {
    const row = getDB().prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as any
    if (!row) return null
    const counts = getDB().prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN user_status IS NOT NULL THEN 1 ELSE 0 END) AS decided,
         SUM(CASE WHEN ai_status = 'done' THEN 1 ELSE 0 END) AS analyzed
       FROM images WHERE project_id = ?`,
    ).get(id) as any
    return {
      id: row.id, name: row.name, sourceDir: row.source_dir,
      createdAt: row.created_at, updatedAt: row.updated_at,
      imageCount: counts.total ?? 0,
      decidedCount: counts.decided ?? 0,
      aiAnalyzedCount: counts.analyzed ?? 0,
      coverHashes: [row.cover_hash_1, row.cover_hash_2, row.cover_hash_3, row.cover_hash_4].filter(Boolean) as string[],
    }
  },

  listProjects(): Project[] {
    const rows = getDB().prepare(`SELECT id FROM projects ORDER BY updated_at DESC`).all() as { id: string }[]
    return rows.map((r) => this.getProject(r.id)!).filter(Boolean)
  },

  deleteProject(id: string): void {
    getDB().prepare(`DELETE FROM projects WHERE id = ?`).run(id)
  },

  touchProject(id: string): void {
    getDB().prepare(`UPDATE projects SET updated_at = ? WHERE id = ?`).run(Date.now(), id)
  },

  refreshCovers(projectId: string): void {
    const top = getDB().prepare(
      `SELECT hash FROM images
         WHERE project_id = ? AND ai_quality_score IS NOT NULL
         ORDER BY (COALESCE(user_score, 0) * 20 + COALESCE(ai_aesthetic_score, 0)) DESC
         LIMIT 4`,
    ).all(projectId) as { hash: string }[]
    const h = [top[0]?.hash ?? null, top[1]?.hash ?? null, top[2]?.hash ?? null, top[3]?.hash ?? null]
    getDB().prepare(
      `UPDATE projects SET cover_hash_1=?, cover_hash_2=?, cover_hash_3=?, cover_hash_4=?, updated_at=? WHERE id=?`,
    ).run(h[0], h[1], h[2], h[3], Date.now(), projectId)
  },

  findProjectBySourceDir(sourceDir: string): Project | null {
    const row = getDB().prepare(`SELECT id FROM projects WHERE source_dir = ?`).get(sourceDir) as { id: string } | undefined
    return row ? this.getProject(row.id) : null
  },

  // ── Images ─────────────────────────────────
  insertImageIfMissing(input: {
    projectId: string; path: string; filename: string; hash: string
    sizeBytes: number; width: number | null; height: number | null
  }): Image | null {
    const existing = getDB().prepare(
      `SELECT id FROM images WHERE project_id=? AND hash=?`,
    ).get(input.projectId, input.hash) as { id: string } | undefined
    if (existing) return null

    const id = randomUUID()
    const now = Date.now()
    getDB().prepare(
      `INSERT INTO images(id, project_id, path, filename, hash, size_bytes, width, height, imported_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.projectId, input.path, input.filename, input.hash,
          input.sizeBytes, input.width, input.height, now)
    return this.getImage(id)
  },

  getImage(id: string): Image | null {
    const row = getDB().prepare(`SELECT * FROM images WHERE id = ?`).get(id) as ImageRow | undefined
    if (!row) return null
    const tags = getDB().prepare(
      `SELECT tag_category AS category, tag_value AS value FROM image_tags WHERE image_id = ?`,
    ).all(id) as Tag[]
    return rowToImage(row, tags)
  },

  updateDecision(input: { id: string; status?: UserStatus; score?: number | null; note?: string | null }): void {
    const sets: string[] = []
    const vals: any[] = []
    if (input.status !== undefined) { sets.push('user_status = ?'); vals.push(input.status) }
    if (input.score !== undefined) { sets.push('user_score = ?'); vals.push(input.score) }
    if (input.note !== undefined) { sets.push('user_note = ?'); vals.push(input.note) }
    if (!sets.length) return
    sets.push('decided_at = ?'); vals.push(Date.now())
    vals.push(input.id)
    getDB().prepare(`UPDATE images SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  },

  // ── AI write-back ─────────────────────────
  setImageAIStatus(id: string, status: AIStatus, error?: string | null): void {
    getDB().prepare(
      `UPDATE images SET ai_status=?, ai_error=? WHERE id=?`,
    ).run(status, error ?? null, id)
  },

  saveAIAnalysis(input: {
    imageId: string
    qualityScore: number; aestheticScore: number
    caption: string; promptGuess: string
    tags: Tag[]
  }): void {
    const db = getDB()
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE images SET ai_status='done', ai_quality_score=?, ai_aesthetic_score=?,
           ai_caption=?, ai_prompt_guess=?, ai_analyzed_at=?, ai_error=NULL WHERE id=?`,
      ).run(input.qualityScore, input.aestheticScore, input.caption, input.promptGuess, Date.now(), input.imageId)
      db.prepare(`DELETE FROM image_tags WHERE image_id = ?`).run(input.imageId)
      const ins = db.prepare(`INSERT INTO image_tags(image_id, tag_category, tag_value) VALUES (?,?,?)`)
      for (const t of input.tags) ins.run(input.imageId, t.category, t.value)
    })
    tx()
  },

  saveEmbedding(imageId: string, vector: Float32Array): void {
    const buf = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength)
    getDB().prepare(`UPDATE images SET ai_embedding=? WHERE id=?`).run(buf, imageId)
  },

  loadEmbeddingsForProject(projectId: string): { id: string; vector: Float32Array }[] {
    const rows = getDB().prepare(
      `SELECT id, ai_embedding FROM images
        WHERE project_id=? AND ai_embedding IS NOT NULL`,
    ).all(projectId) as { id: string; ai_embedding: Buffer }[]
    return rows.map((r) => ({
      id: r.id,
      vector: new Float32Array(r.ai_embedding.buffer, r.ai_embedding.byteOffset, r.ai_embedding.byteLength / 4),
    }))
  },

  setClusterAssignments(projectId: string, assignments: { imageId: string; clusterId: number }[]): void {
    const db = getDB()
    const upd = db.prepare(`UPDATE images SET ai_cluster_id=? WHERE id=?`)
    const tx = db.transaction(() => { for (const a of assignments) upd.run(a.clusterId, a.imageId) })
    tx()
  },

  upsertCluster(input: Cluster): void {
    getDB().prepare(
      `INSERT INTO clusters(project_id, id, representative_image_id, size, summary)
       VALUES (?,?,?,?,?)
       ON CONFLICT(project_id, id) DO UPDATE SET
         representative_image_id=excluded.representative_image_id,
         size=excluded.size, summary=excluded.summary`,
    ).run(input.projectId, input.id, input.representativeImageId, input.size, input.summary)
  },

  listClusters(projectId: string): Cluster[] {
    const rows = getDB().prepare(`SELECT * FROM clusters WHERE project_id=? ORDER BY size DESC`).all(projectId) as any[]
    return rows.map((r) => {
      const ids = getDB().prepare(
        `SELECT id FROM images WHERE project_id=? AND ai_cluster_id=?`,
      ).all(projectId, r.id) as { id: string }[]
      return {
        projectId: r.project_id, id: r.id,
        representativeImageId: r.representative_image_id,
        size: r.size, summary: r.summary,
        imageIds: ids.map((x) => x.id),
      }
    })
  },

  // ── Pending-AI queue ─────────────────────
  listPendingImages(projectId: string, limit = 1000): { id: string; path: string; hash: string }[] {
    return getDB().prepare(
      `SELECT id, path, hash FROM images
        WHERE project_id=? AND ai_status IN ('pending','error')
        ORDER BY imported_at ASC LIMIT ?`,
    ).all(projectId, limit) as { id: string; path: string; hash: string }[]
  },

  // ── Image query (filters + sort + pagination) ──
  queryImages(params: ImageQueryParams): { items: Image[]; total: number; nextCursor: number | null } {
    const { projectId, filters, sort, cursor, limit } = params
    const where: string[] = ['i.project_id = ?']
    const values: any[] = [projectId]

    // Status (multi-select; 'undecided' = NULL)
    if (filters.status && filters.status.length) {
      const parts: string[] = []
      for (const s of filters.status) {
        if (s === 'undecided' || s === null) parts.push('i.user_status IS NULL')
        else { parts.push('i.user_status = ?'); values.push(s) }
      }
      where.push(`(${parts.join(' OR ')})`)
    }
    if (filters.scoreRange) {
      where.push('i.user_score BETWEEN ? AND ?')
      values.push(filters.scoreRange[0], filters.scoreRange[1])
    }
    if (filters.qualityRange) {
      where.push('(i.ai_quality_score IS NOT NULL AND i.ai_quality_score BETWEEN ? AND ?)')
      values.push(filters.qualityRange[0], filters.qualityRange[1])
    }
    if (filters.aestheticRange) {
      where.push('(i.ai_aesthetic_score IS NOT NULL AND i.ai_aesthetic_score BETWEEN ? AND ?)')
      values.push(filters.aestheticRange[0], filters.aestheticRange[1])
    }
    if (filters.clusterId !== undefined && filters.clusterId !== null) {
      where.push('i.ai_cluster_id = ?'); values.push(filters.clusterId)
    }
    if (filters.naturalLanguageIds && filters.naturalLanguageIds.length) {
      const placeholders = filters.naturalLanguageIds.map(() => '?').join(',')
      where.push(`i.id IN (${placeholders})`)
      values.push(...filters.naturalLanguageIds)
    }
    if (filters.tags && filters.tags.length) {
      // every tag must match (AND across categories, but values within same category as OR)
      const grouped = new Map<string, string[]>()
      for (const t of filters.tags) {
        const arr = grouped.get(t.category) ?? []
        arr.push(t.value); grouped.set(t.category, arr)
      }
      for (const [cat, vals] of grouped) {
        const placeholders = vals.map(() => '?').join(',')
        where.push(
          `i.id IN (SELECT image_id FROM image_tags WHERE tag_category=? AND tag_value IN (${placeholders}))`,
        )
        values.push(cat, ...vals)
      }
    }

    const orderBy = {
      imported: 'i.imported_at DESC',
      quality:  'i.ai_quality_score DESC NULLS LAST, i.imported_at DESC',
      aesthetic:'i.ai_aesthetic_score DESC NULLS LAST, i.imported_at DESC',
      score:    'i.user_score DESC NULLS LAST, i.imported_at DESC',
    }[sort]

    const totalRow = getDB().prepare(
      `SELECT COUNT(*) AS n FROM images i WHERE ${where.join(' AND ')}`,
    ).get(...values) as { n: number }

    const offset = cursor ?? 0
    const rows = getDB().prepare(
      `SELECT i.* FROM images i WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ).all(...values, limit, offset) as ImageRow[]

    const ids = rows.map((r) => r.id)
    const tagRows = ids.length
      ? getDB().prepare(
          `SELECT image_id, tag_category, tag_value FROM image_tags
           WHERE image_id IN (${ids.map(() => '?').join(',')})`,
        ).all(...ids) as { image_id: string; tag_category: string; tag_value: string }[]
      : []
    const tagsByImage = new Map<string, Tag[]>()
    for (const t of tagRows) {
      const arr = tagsByImage.get(t.image_id) ?? []
      arr.push({ category: t.tag_category as any, value: t.tag_value })
      tagsByImage.set(t.image_id, arr)
    }
    const items = rows.map((r) => rowToImage(r, tagsByImage.get(r.id) ?? []))
    const nextCursor = items.length === limit ? offset + limit : null
    return { items, total: totalRow.n, nextCursor }
  },

  // ── Tag aggregation for facet sidebar ────
  aggregateTags(projectId: string): { category: string; value: string; count: number }[] {
    return getDB().prepare(
      `SELECT t.tag_category AS category, t.tag_value AS value, COUNT(*) AS count
         FROM image_tags t
         JOIN images i ON i.id = t.image_id
        WHERE i.project_id = ?
        GROUP BY t.tag_category, t.tag_value
        ORDER BY count DESC`,
    ).all(projectId) as { category: string; value: string; count: number }[]
  },
}
