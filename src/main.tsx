import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

// Bundle Noto Sans SC (chinese-simplified subset) so the app renders correctly on any OS,
// including Linux distros without preinstalled CJK fonts. ~700KB total compressed.
import '@fontsource/noto-sans-sc/chinese-simplified-400.css'
import '@fontsource/noto-sans-sc/chinese-simplified-600.css'

import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
