import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { runMigrations } from './db/migrate'
import { closeDB } from './db/connection'
import { registerThumbProtocol, registerThumbScheme } from './protocols/tlxThumb'
import { registerImageProtocol, registerImageScheme } from './protocols/tlxImage'
import { registerAllIPC } from './ipc'

// 图灵选不依赖 GPU 加速（图片处理在主进程 sharp 走 CPU，渲染是普通 DOM）。
// WSL2 / 无独显环境下 chromium 启 GPU 进程会崩；mac/win/linux 上关掉也只是略增 CPU 渲染负担。
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('in-process-gpu')
if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
  app.commandLine.appendSwitch('no-sandbox')
  // WSL2 的 /dev/shm 在 memfd 链接时会触发 ESRCH FATAL（即使权限是 1777）。
  // 改用 /tmp 做共享内存，绕开 dev/shm 的子进程崩溃，否则首启会丢一个 GPU/utility 子进程。
  app.commandLine.appendSwitch('disable-dev-shm-usage')
}

registerThumbScheme()
registerImageScheme()

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    // Latin-only title for OS-native chrome (window/menu/dialog use system fonts,
    // not our bundled CJK webfont). App content inside the window remains 全中文.
    title: 'Tulingxuan',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, contextIsolation: true,
    },
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    // Auto-open devtools in dev mode so users see renderer-side errors immediately.
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Surface unhandled errors in main process — they're often the cause of "app
// froze then quit" reports. Without this they vanish silently.
process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection:', reason)
})

app.whenReady().then(() => {
  runMigrations()
  registerAllIPC()
  registerThumbProtocol()
  registerImageProtocol()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => closeDB())
