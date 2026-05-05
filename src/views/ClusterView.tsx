import { useQuery } from '@tanstack/react-query'
import type { Cluster } from '@shared/types'
import { api } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useState } from 'react'

export function ClusterView({ projectId }: { projectId: string }) {
  const setFilters = useWorkspaceStore((s) => s.setFilters)
  const setView = useWorkspaceStore((s) => s.setView)
  const [computing, setComputing] = useState(false)

  const clusters = useQuery<Cluster[]>({
    queryKey: ['clusters', projectId],
    queryFn: () => api.clustering.list(projectId),
    refetchInterval: 5000,
  })

  async function compute() {
    setComputing(true)
    try { await api.clustering.compute(projectId); await clusters.refetch() }
    finally { setComputing(false) }
  }

  if (!clusters.data?.length) {
    return (
      <div style={{ padding: 32, color: '#888' }}>
        <p style={{ marginBottom: 16 }}>还没有聚类结果。等大部分图分析完后点下面按钮：</p>
        <button onClick={compute} disabled={computing}
          style={{ background: '#4a90e2', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer' }}>
          {computing ? '计算中…' : '生成相似图分组'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ overflow: 'auto', height: '100%', padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#888', fontSize: 13 }}>{clusters.data.length} 个相似分组</span>
        <button onClick={compute} disabled={computing} style={{ background: '#222', color: '#ddd', border: '1px solid #333', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>
          {computing ? '重算中…' : '↻ 重算'}
        </button>
      </div>
      {clusters.data.map((c) => (
        <div key={c.id} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>{c.summary ?? `分组 ${c.id}`} <span style={{ color: '#666' }}>· {c.size} 张</span></span>
            <button onClick={() => { setFilters({ clusterId: c.id }); setView('grid') }}
              style={{ background: 'transparent', color: '#4a90e2', border: 'none', cursor: 'pointer', fontSize: 12 }}>
              展开此组 →
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {c.imageIds.slice(0, 8).map((id) => <ClusterThumb key={id} id={id} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function ClusterThumb({ id }: { id: string }) {
  const img = useQuery({ queryKey: ['image', id], queryFn: () => api.images.get(id) })
  if (!img.data) return null
  return <img src={`tlx-thumb://${img.data.hash}`} style={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
}
