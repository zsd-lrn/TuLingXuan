import sharp from 'sharp'
import { getDB } from '../db/connection'
import { DatabaseService } from './DatabaseService'
import { kmeans, chooseK } from '../ai/kmeans'
import { getPrimaryClient } from './AIService'

// Tag-based fallback clustering for when embeddings aren't available
// (account doesn't have an embedding endpoint provisioned). Groups by primary
// style tag, then falls through to mood / palette / subject if the user's set
// is too homogeneous on the primary axis (e.g. 10 screenshots all tagged
// "界面截图" would otherwise collapse into one cluster — useless as overview).
type TagRow = {
  image_id: string
  style: string | null
  subject: string | null
  mood: string | null
  palette: string | null
}

function groupBy(rows: TagRow[], picker: (r: TagRow) => string): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const r of rows) {
    const key = picker(r) || '未分类'
    const arr = m.get(key) ?? []
    arr.push(r.image_id)
    m.set(key, arr)
  }
  return m
}

function tagBasedCluster(projectId: string): { clusters: number } {
  const db = getDB()
  // Pull each image's primary tags across multiple categories at once
  const rows = db.prepare(
    `SELECT i.id AS image_id,
            (SELECT t.tag_value FROM image_tags t WHERE t.image_id = i.id AND t.tag_category = 'style' LIMIT 1) AS style,
            (SELECT t.tag_value FROM image_tags t WHERE t.image_id = i.id AND t.tag_category = 'subject' LIMIT 1) AS subject,
            (SELECT t.tag_value FROM image_tags t WHERE t.image_id = i.id AND t.tag_category = 'mood' LIMIT 1) AS mood,
            (SELECT t.tag_value FROM image_tags t WHERE t.image_id = i.id AND t.tag_category = 'palette' LIMIT 1) AS palette
       FROM images i
      WHERE i.project_id = ? AND i.ai_status = 'done'`
  ).all(projectId) as TagRow[]

  if (rows.length === 0) return { clusters: 0 }

  // Try grouping axes in priority order; pick the first one that gives at
  // least 2 clusters AND no single cluster swallows >70% of images.
  const tooDominant = (groups: Map<string, string[]>) => {
    const sizes = [...groups.values()].map((v) => v.length)
    const max = Math.max(...sizes)
    return groups.size < 2 || max / rows.length > 0.7
  }
  const axes: { name: string; pick: (r: TagRow) => string }[] = [
    { name: 'style',   pick: (r) => r.style || '' },
    { name: 'subject', pick: (r) => r.subject || '' },
    { name: 'mood',    pick: (r) => r.mood || '' },
    { name: 'palette', pick: (r) => r.palette || '' },
  ]
  let chosen = groupBy(rows, axes[0]!.pick)
  let chosenAxis = axes[0]!.name
  for (const a of axes) {
    const g = groupBy(rows, a.pick)
    if (!tooDominant(g)) { chosen = g; chosenAxis = a.name; break }
  }
  // If every axis is too dominant, fall back to compound key (style + mood)
  // — this almost always splits the images into something usable.
  if (tooDominant(chosen)) {
    chosen = groupBy(rows, (r) => `${r.style ?? '?'} · ${r.mood ?? '?'}`)
    chosenAxis = 'style+mood'
  }

  // Wipe stale clusters from any previous run (embedding or tag-based)
  db.prepare(`DELETE FROM clusters WHERE project_id = ?`).run(projectId)
  db.prepare(`UPDATE images SET ai_cluster_id = NULL WHERE project_id = ?`).run(projectId)

  console.log(`[clustering] tag-based fallback: axis=${chosenAxis} clusters=${chosen.size}`)

  let id = 0
  const assignStmt = db.prepare(`UPDATE images SET ai_cluster_id = ? WHERE id = ?`)
  // Sort groups largest-first so the user sees the dominant tag on top
  const sorted = [...chosen.entries()].sort((a, b) => b[1].length - a[1].length)
  for (const [tag, ids] of sorted) {
    const tx = db.transaction(() => { for (const imgId of ids) assignStmt.run(id, imgId) })
    tx()
    DatabaseService.upsertCluster({
      projectId, id,
      representativeImageId: ids[0]!,
      size: ids.length,
      summary: tag === '未分类' ? '未分类（无标签）' : `${tag}（${ids.length} 张）`,
      imageIds: [],
    })
    id++
  }
  return { clusters: id }
}

export const ClusteringService = {
  async compute(projectId: string): Promise<{ clusters: number; mode: 'embedding' | 'tag' }> {
    const points = DatabaseService.loadEmbeddingsForProject(projectId)
    if (points.length === 0) {
      // No embeddings stored — fall back to tag-based grouping. This happens
      // when the doubao account lacks an embedding endpoint, so embedText()
      // failures bubbled up during AnalysisQueue and nothing was persisted.
      const r = tagBasedCluster(projectId)
      return { clusters: r.clusters, mode: 'tag' }
    }
    const k = chooseK(points.length)
    const result = kmeans(points.map((p) => ({ id: p.id, vec: p.vector })), k, { seed: 42 })

    const assignments = points.map((p) => ({ imageId: p.id, clusterId: result.assignments[p.id]! }))
    DatabaseService.setClusterAssignments(projectId, assignments)

    // size + summary per cluster
    const counts = new Array(k).fill(0)
    for (const a of assignments) counts[a.clusterId]++

    const client = getPrimaryClient()
    for (let i = 0; i < k; i++) {
      const repId = result.representative[i]
      if (!repId) continue
      // pick rep + 3 random others for summary
      const inCluster = assignments.filter((a) => a.clusterId === i).slice(0, 4)
      const images = inCluster.map((a) => DatabaseService.getImage(a.imageId)).filter(Boolean) as any[]
      let summary: string | null = null
      try {
        const imagesBase64 = await Promise.all(images.slice(0, 4).map(async (img) =>
          (await sharp(img.path).resize({ width: 384, height: 384, fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64')
        ))
        summary = await client.summarizeCluster({ imagesBase64 })
      } catch (e) {
        console.warn('cluster summary failed', e)
      }
      DatabaseService.upsertCluster({
        projectId, id: i, representativeImageId: repId,
        size: counts[i], summary, imageIds: [],
      })
    }
    return { clusters: k, mode: 'embedding' }
  },
}
