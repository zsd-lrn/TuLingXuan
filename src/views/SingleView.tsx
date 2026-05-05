import { useEffect } from 'react'
import type { Image } from '@shared/types'
import { useImageQuery } from '../hooks/useImageQuery'
import { useWorkspaceStore } from '../stores/workspaceStore'

export function SingleView({ projectId }: { projectId: string }) {
  const { data } = useImageQuery(projectId)
  const items: Image[] = data?.items ?? []
  const focused = useWorkspaceStore((s) => s.focusedImageId)
  const setFocused = useWorkspaceStore((s) => s.setFocused)
  const setView = useWorkspaceStore((s) => s.setView)

  const idx = focused ? items.findIndex((i: Image) => i.id === focused) : 0
  const cur = items[idx >= 0 ? idx : 0]

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === 'Escape') setView('grid')
      if (e.key === 'ArrowRight' || e.key === 'l') {
        const next = items[Math.min(items.length - 1, idx + 1)]
        if (next) setFocused(next.id)
      }
      if (e.key === 'ArrowLeft' || e.key === 'h') {
        const prev = items[Math.max(0, idx - 1)]
        if (prev) setFocused(prev.id)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [idx, items, setFocused, setView])

  if (!cur) return <div style={{ padding: 24, color: '#666' }}>没有图片</div>

  return (
    <div style={{ position: 'relative', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src={`tlx-image://${cur.id}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: '#888', fontSize: 12 }}>
        {idx + 1} / {items.length} · {cur.filename} · Esc 退出 · ←/→ 翻图
      </div>
    </div>
  )
}
