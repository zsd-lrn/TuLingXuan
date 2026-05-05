import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Project } from '@shared/types'
import { api } from '../lib/ipc'
import { TopBar } from '../components/TopBar'
import { FilterSidebar } from '../components/FilterSidebar'
import { Inspector } from '../components/Inspector'
import { GridView } from '../views/GridView'
import { ClusterView } from '../views/ClusterView'
import { SingleView } from '../views/SingleView'
import { CompareView } from '../views/CompareView'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useImageQuery } from '../hooks/useImageQuery'
import { useKeyboardCommand } from '../hooks/useKeyboardCommand'
import { useAIProgress } from '../hooks/useAIProgress'

export function WorkspacePage({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const project = useQuery<Project>({ queryKey: ['project', projectId], queryFn: () => api.projects.get(projectId), refetchInterval: 2000 })
  const view = useWorkspaceStore((s) => s.view)
  const imageList = useImageQuery(projectId)
  useKeyboardCommand(projectId, imageList.data?.items ?? [])
  const ai = useAIProgress(projectId)

  useEffect(() => {
    api.ai.start(projectId).catch(console.error)
  }, [projectId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TopBar projectId={projectId} projectName={project.data?.name ?? '...'} onBack={onBack} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '220px 1fr 280px', minHeight: 0 }}>
        <div style={{ borderRight: '1px solid #222', overflow: 'auto' }}>
          <FilterSidebar projectId={projectId} />
        </div>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          {view === 'grid' && <GridView projectId={projectId} />}
          {view === 'cluster' && <ClusterView projectId={projectId} />}
          {view === 'compare' && <CompareView projectId={projectId} />}
          {view === 'single' && <SingleView projectId={projectId} />}
        </div>
        <div style={{ borderLeft: '1px solid #222', overflow: 'auto' }}>
          <Inspector projectId={projectId} />
        </div>
      </div>
      <div style={{ height: 28, borderTop: '1px solid #222', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 11, color: '#666' }}>
        {project.data && <span>{project.data.imageCount} 张 · 已决策 {project.data.decidedCount} · 已分析 {project.data.aiAnalyzedCount}</span>}
        {ai.total > 0 && <span style={{ marginLeft: 12 }}>AI 分析 {ai.done}/{ai.total}</span>}
      </div>
    </div>
  )
}
