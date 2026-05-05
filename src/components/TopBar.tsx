import { useWorkspaceStore, type ViewName } from '../stores/workspaceStore'

const VIEWS: { id: ViewName; label: string }[] = [
  { id: 'grid',    label: '⊞ 网格' },
  { id: 'cluster', label: '⚇ 聚类' },
  { id: 'compare', label: '⊟ 对比' },
  { id: 'single',  label: '◉ 单图' },
]

export function TopBar({ projectName, onBack }: { projectName: string; onBack: () => void }) {
  const view = useWorkspaceStore((s) => s.view)
  const setView = useWorkspaceStore((s) => s.setView)
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 44, padding: '0 12px', borderBottom: '1px solid #222', gap: 12 }}>
      <button onClick={onBack} style={{ background: 'transparent', color: '#aaa', border: 'none', cursor: 'pointer' }}>←</button>
      <div style={{ fontWeight: 600 }}>{projectName}</div>
      <div style={{ flex: 1 }} />
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
    </div>
  )
}
