import sharp from 'sharp'
import { DatabaseService } from './DatabaseService'
import { kmeans, chooseK } from '../ai/kmeans'
import { getPrimaryClient } from './AIService'

export const ClusteringService = {
  async compute(projectId: string): Promise<{ clusters: number }> {
    const points = DatabaseService.loadEmbeddingsForProject(projectId)
    if (points.length === 0) return { clusters: 0 }
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
    return { clusters: k }
  },
}
