import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspaceStore'

export function useImageQuery(projectId: string) {
  const filters = useWorkspaceStore((s) => s.filters)
  const sort = useWorkspaceStore((s) => s.sort)

  return useQuery({
    queryKey: ['images', projectId, filters, sort],
    queryFn: () => api.images.query({ projectId, filters, sort, cursor: 0, limit: 1000 }),
    placeholderData: (prev) => prev,
  })
}
