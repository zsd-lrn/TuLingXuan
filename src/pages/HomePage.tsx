import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project } from '@shared/types'
import { api } from '../lib/ipc'
import { DropZone } from '../components/DropZone'

export function HomePage({ onOpen, onSettings }: { onOpen: (id: string) => void; onSettings: () => void }) {
  const qc = useQueryClient()
  const projects = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => api.projects.list() })
  const del = useMutation({
    mutationFn: (id: string) => api.projects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  function handleDelete(p: Project, e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`删除项目「${p.name}」？\n\n仅删除元数据（评分/标签/缓存的 AI 分析）。原图不动。`)) {
      del.mutate(p.id)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>图灵选</h1>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>把 500 张候选图变 8 张能用图，从 2 小时压到 15 分钟</div>
        </div>
        <button onClick={onSettings} style={btnStyle}>设置</button>
      </header>

      <DropZone onCreated={onOpen} />

      <h2 style={{ marginTop: 48, marginBottom: 16, fontSize: 18, color: '#aaa' }}>历史项目</h2>
      {projects.data?.length === 0 && (
        <div style={{ color: '#666', fontSize: 13 }}>还没有项目，从上面拖入或选择文件夹开始</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {projects.data?.map((p: Project) => (
          <div key={p.id} onClick={() => onOpen(p.id)} className="project-card"
               style={{ background: '#18181b', borderRadius: 10, padding: 14, cursor: 'pointer', position: 'relative' }}>
            <button
              onClick={(e) => handleDelete(p, e)}
              title="删除项目"
              style={{
                position: 'absolute', top: 6, right: 6, width: 22, height: 22,
                background: 'rgba(0,0,0,0.6)', color: '#aaa', border: '1px solid #333',
                borderRadius: 4, cursor: 'pointer', fontSize: 14, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
              }}
            >×</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 10, height: 120, background: '#0a0a0a', borderRadius: 6, overflow: 'hidden' }}>
              {p.coverHashes.length === 0
                ? <div style={{ gridColumn: '1 / span 2', display:'flex', alignItems:'center', justifyContent:'center', color:'#444' }}>—</div>
                : p.coverHashes.slice(0, 4).map((h: string) => (
                    <img key={h} src={`tlx-thumb://${h}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ))}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
            <div style={{ color: '#666', fontSize: 11, marginTop: 6 }}>
              {p.imageCount} 张 · 已决策 {p.decidedCount} · 已分析 {p.aiAnalyzedCount}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: '#222', color: '#ddd', border: '1px solid #333', borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
}
