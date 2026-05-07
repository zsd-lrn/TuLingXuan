import { useWorkspaceStore, type ViewName } from '../stores/workspaceStore'
import { SearchBar } from './SearchBar'
import { ExportButton } from './ExportButton'

const VIEWS: { id: ViewName; label: string }[] = [
  { id: 'grid',    label: '⊞ 网格' },
  { id: 'cluster', label: '⚇ 聚类' },
  { id: 'compare', label: '⊟ 对比' },
  { id: 'single',  label: '◉ 单图' },
]

export function TopBar({
  projectId, projectName, onBack, aiProgress,
}: {
  projectId: string
  projectName: string
  onBack: () => void
  aiProgress?: { done: number; total: number }
}) {
  const view = useWorkspaceStore((s) => s.view)
  const setView = useWorkspaceStore((s) => s.setView)
  const showProgress = !!aiProgress && aiProgress.total > 0 && aiProgress.done < aiProgress.total
  const pct = showProgress ? Math.round((aiProgress!.done / aiProgress!.total) * 100) : 0
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 44, padding: '0 12px', borderBottom: '1px solid #222', gap: 12 }}>
      <button onClick={onBack} style={{ background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}>←</button>
      <div style={{ fontWeight: 600 }}>{projectName}</div>
      {showProgress && (
        <span style={{ fontSize: 11, color: '#4a90e2', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="ai-spinner" style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#4a90e2',
            animation: 'tlx-pulse 1s ease-in-out infinite',
          }} />
          AI 分析中 {aiProgress!.done}/{aiProgress!.total}
        </span>
      )}
      <div style={{ flex: 1 }} />
      <SearchBar projectId={projectId} />
      <ExportButton projectId={projectId} />
      <div style={{ display: 'flex', gap: 4 }}>
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v.id)}
                  style={{
                    background: view === v.id ? '#2a2a2e' : 'transparent',
                    color: '#ddd', border: '1px solid #333',
                    padding: '4px 10px', borderRadius: 5, cursor: 'pointer',
                  }}>
            {v.label}
          </button>
        ))}
      </div>
      {/* slim progress bar pinned to the bottom edge of TopBar */}
      {showProgress && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: '#1a1a1c' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#4a90e2', transition: 'width 0.3s ease' }} />
        </div>
      )}
    </div>
  )
}
