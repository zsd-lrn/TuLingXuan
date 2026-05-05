import { useState } from 'react'
import { api } from '../lib/ipc'
import { useWorkspaceStore } from '../stores/workspaceStore'

export function SearchBar({ projectId }: { projectId: string }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const setFilters = useWorkspaceStore((s) => s.setFilters)
  const setView = useWorkspaceStore((s) => s.setView)

  async function search() {
    if (!q.trim()) {
      setFilters({ naturalLanguageIds: undefined })
      return
    }
    setBusy(true)
    try {
      const { ids } = await api.ai.nlSearch(projectId, q.trim())
      setFilters({ naturalLanguageIds: ids })
      setView('grid')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input id="search-input" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
        placeholder="自然语言搜图（按 / 聚焦）"
        style={{ width: 260, background: '#0a0a0a', border: '1px solid #333', color: '#ddd', padding: '5px 10px', borderRadius: 5, fontSize: 12 }} />
      <button onClick={search} disabled={busy} style={{ background: '#222', color: '#ddd', border: '1px solid #333', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
        {busy ? '搜索中…' : '🔍'}
      </button>
    </div>
  )
}
