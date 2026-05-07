import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/ipc'

export type AIProgressState = {
  done: number
  total: number
  currentImageIds: string[]
}

export function useAIProgress(projectId: string) {
  const [progress, setProgress] = useState<AIProgressState>({ done: 0, total: 0, currentImageIds: [] })
  const qc = useQueryClient()
  // Auto-trigger clustering when AI is ~80% done. README's stated "ideal" but
  // never wired up — guarded by a ref so it fires once per project lifecycle.
  const clusteredRef = useRef(false)

  useEffect(() => {
    clusteredRef.current = false  // reset when switching projects
    const off1 = api.events.onAIProgress((e: { projectId: string; done: number; total: number; currentImageIds?: string[] }) => {
      if (e.projectId !== projectId) return
      setProgress({ done: e.done, total: e.total, currentImageIds: e.currentImageIds ?? [] })
      if (!clusteredRef.current && e.total >= 5 && e.done / e.total >= 0.8) {
        clusteredRef.current = true
        console.log(`[useAIProgress] auto-trigger clustering at ${e.done}/${e.total}`)
        api.clustering.compute(projectId)
          .then(() => qc.invalidateQueries({ queryKey: ['clusters', projectId] }))
          .catch((err) => console.warn('auto-cluster failed', err))
      }
    })
    const off2 = api.events.onAIImageUpdated(() => {
      qc.invalidateQueries({ queryKey: ['images'] })
    })
    // Without this, the grid stays empty forever: projects.create returns the empty project
    // synchronously while import runs in the background, and useImageQuery has no refetch
    // interval to pick up newly-inserted rows. Refetch on every progress tick, then re-arm
    // ai.start once import finishes (the initial ai.start runs against an empty queue).
    const off3 = api.events.onImportProgress((e: { projectId: string; done: number; total: number }) => {
      if (e.projectId !== projectId) return
      qc.invalidateQueries({ queryKey: ['images'] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      if (e.done > 0 && e.done === e.total) {
        api.ai.start(projectId).catch(console.error)
      }
    })
    return () => {
      off1()
      off2()
      off3()
    }
  }, [projectId, qc])

  return progress
}
