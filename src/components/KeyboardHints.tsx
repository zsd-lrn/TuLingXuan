import { useEffect, useState } from 'react'

export function KeyboardHints() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if (e.key === '?') setOpen((v) => !v)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  if (!open) return null
  return (
    <div onClick={() => setOpen(false)}
         style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#1a1a1c', padding: 24, borderRadius: 8, minWidth: 360 }}>
        <h3 style={{ marginBottom: 16 }}>快捷键</h3>
        <table style={{ fontSize: 12 }}>
          <tbody>
            {[
              ['J K H L', '导航'],
              ['1-5', '评分'],
              ['F D Space', '好/差/待定'],
              ['0', '清除决策'],
              ['Enter / Esc', '进入/退出单图'],
              ['C', '对比视图'],
              ['Cmd/Ctrl + 1-4', '切换视图'],
              ['/', '聚焦搜索'],
              ['?', '显示/隐藏此帮助'],
            ].map(([k, v]) => (
              <tr key={k}><td style={{ padding: 4, color: '#aaa', fontFamily: 'monospace' }}>{k}</td><td style={{ padding: 4, color: '#888' }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>按 Esc 或点空白关闭</div>
      </div>
    </div>
  )
}
