import { ipcMain, dialog, BrowserWindow } from 'electron'

export function registerShellIPC() {
  ipcMain.handle('shell.pickDirectory', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined
    const r = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: 'Pick image folder · 选择图片文件夹',
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('shell.pickExportTarget', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? undefined
    const r = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Pick export folder · 选择导出目标文件夹',
    })
    return r.canceled ? null : r.filePaths[0]
  })
}
