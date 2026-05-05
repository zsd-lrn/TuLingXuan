import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/ipc'

export function useAIProgress(projectId: string) {
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const qc = useQueryClient()

  useEffect(() => {
    const off1 = api.events.onAIProgress((e: { projectId: string; done: number; total: number }) => {
      if (e.projectId === projectId) setProgress({ done: e.done, total: e.total })
    })
    const off2 = api.events.onAIImageUpdated(() => {
      qc.invalidateQueries({ queryKey: ['images'] })
    })
    return () => {
      off1()
      off2()
    }
  }, [projectId, qc])

  return progress
}
