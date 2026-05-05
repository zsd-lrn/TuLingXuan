import { useEffect, useState } from 'react'

export function StatusBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div style={{ background: '#854d0e', color: '#fff', padding: '6px 12px', fontSize: 12, textAlign: 'center' }}>
      ⚠ 网络离线 — AI 服务暂停，恢复后会自动续跑
    </div>
  )
}
