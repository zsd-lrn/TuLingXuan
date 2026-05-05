import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// Bundle Noto Sans SC (chinese-simplified subset) so the app renders correctly on any OS,
// including Linux distros without preinstalled CJK fonts. ~700KB total compressed.
import '@fontsource/noto-sans-sc/chinese-simplified-400.css'
import '@fontsource/noto-sans-sc/chinese-simplified-600.css'

import './styles/globals.css'

// Surface unhandled errors in renderer to help diagnose freezes.
window.addEventListener('error', (e) => console.error('[renderer] error:', e.error ?? e.message))
window.addEventListener('unhandledrejection', (e) => console.error('[renderer] unhandledRejection:', e.reason))

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, color: '#f87171', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>渲染时发生错误</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error?.stack || this.state.error)}</pre>
          <button
            onClick={() => location.reload()}
            style={{ marginTop: 16, padding: '8px 16px', background: '#222', color: '#ddd', border: '1px solid #444', borderRadius: 4, cursor: 'pointer' }}
          >重新加载</button>
        </div>
      )
    }
    return this.props.children
  }
}

// React.StrictMode intentionally double-invokes effects in dev to surface bugs;
// for an app that triggers AI work on mount, that doubles every IPC call.
// We guard server-side via AnalysisQueue.isRunning, but skipping StrictMode also
// avoids confusing duplicate event-listener registrations during development.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
