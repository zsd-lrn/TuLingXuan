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

  const statusLabel = cur.userStatus === 'good' ? '好' : cur.userStatus === 'bad' ? '差' : cur.userStatus === 'maybe' ? '待定' : null
  const statusColor = cur.userStatus === 'good' ? '#22c55e' : cur.userStatus === 'bad' ? '#71717a' : cur.userStatus === 'maybe' ? '#eab308' : '#333'

  return (
    <div style={{ position: 'relative', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <img src={`tlx-image://${cur.id}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />

      {/* Top-right: live decision badge — gives instant feedback for keyboard mark/score in this view */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        {statusLabel && (
          <span style={{ background: statusColor, color: cur.userStatus === 'maybe' ? '#000' : '#fff', padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
            {statusLabel}
          </span>
        )}
        {cur.userScore && (
          <span style={{ background: 'rgba(0,0,0,0.7)', color: '#eab308', padding: '4px 12px', borderRadius: 999, fontSize: 13, letterSpacing: 1 }}>
            {'★'.repeat(cur.userScore)}{'☆'.repeat(5 - cur.userScore)}
          </span>
        )}
        {!statusLabel && !cur.userScore && (
          <span style={{ background: 'rgba(0,0,0,0.5)', color: '#666', padding: '4px 12px', borderRadius: 999, fontSize: 12 }}>
            未标注
          </span>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', color: '#888', fontSize: 12 }}>
        {idx + 1} / {items.length} · {cur.filename} · F/D/Space 标好/差/待定 · 1-5 评分 · Esc 退出 · ←/→ 翻图
      </div>
    </div>
  )
}
