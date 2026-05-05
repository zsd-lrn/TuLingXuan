import { ipcMain } from 'electron'
import { DatabaseService } from '../services/DatabaseService'

export function registerProjectIPC() {
  ipcMain.handle('projects.list', () => DatabaseService.listProjects())
  ipcMain.handle('projects.get',  (_e, id: string) => DatabaseService.getProject(id))
  ipcMain.handle('projects.delete', (_e, id: string) => DatabaseService.deleteProject(id))
  ipcMain.handle('projects.findBySourceDir', (_e, dir: string) => DatabaseService.findProjectBySourceDir(dir))
  // create handler is in Task 9 (needs FileService + ThumbnailService)
}
