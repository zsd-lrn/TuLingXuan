import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Project } from '@shared/types'
import { api } from '../lib/ipc'
import { TopBar } from '../components/TopBar'
import { FilterSidebar } from '../components/FilterSidebar'
import { Inspector } from '../components/Inspector'
import { KeyboardHints } from '../components/KeyboardHints'
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
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.settings.get() })
  const view = useWorkspaceStore((s) => s.view)
  const imageList = useImageQuery(projectId)
  useKeyboardCommand(projectId, imageList.data?.items ?? [])
  const ai = useAIProgress(projectId)
  const [hint, setHint] = useState(() => !localStorage.getItem('tlx_onboarded'))
  function dismiss() {
    localStorage.setItem('tlx_onboarded', '1')
    setHint(false)
  }

  useEffect(() => {
    api.ai.start(projectId).catch(console.error)
  }, [projectId])

  const aiOff = settings.data && !settings.data.mockMode && !settings.data.doubaoKey

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {hint && (
        <div style={{ background: '#1e3a8a', color: '#fff', padding: '8px 12px', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>提示：500 张图建议先点 ⚇ 聚类视图（Cmd/Ctrl+2）从概览开始。按 ? 看完整快捷键。</span>
          <button onClick={dismiss} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {aiOff && (
        <div style={{ background: '#7f1d1d', color: '#fff', padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>
          ⚠ 未配置 AI key — 仅人工筛选可用，去{' '}
          <button
            onClick={() => {}}
            style={{ background: 'transparent', color: '#fca5a5', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}
          >
            设置
          </button>
          {' '}配置后体验完整 AI
        </div>
      )}
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
      <KeyboardHints />
    </div>
  )
}
