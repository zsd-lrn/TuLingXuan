import { ipcMain, BrowserWindow } from 'electron'
import { basename } from 'path'
import sharp from 'sharp'
import { DatabaseService } from '../services/DatabaseService'
import { scanImageFolder } from '../services/FileService'
import { ThumbnailService } from '../services/ThumbnailService'

export function registerProjectIPC() {
  ipcMain.handle('projects.list', () => DatabaseService.listProjects())
  ipcMain.handle('projects.get',  (_e, id: string) => DatabaseService.getProject(id))
  ipcMain.handle('projects.delete', (_e, id: string) => DatabaseService.deleteProject(id))
  ipcMain.handle('projects.findBySourceDir', (_e, dir: string) => DatabaseService.findProjectBySourceDir(dir))
  // create handler is in Task 9 (needs FileService + ThumbnailService)
}

export function registerProjectCreate() {
  ipcMain.handle('projects.create', async (_e, input: { sourceDir: string; name?: string }) => {
    const project = DatabaseService.createProject({
      name: input.name ?? basename(input.sourceDir),
      sourceDir: input.sourceDir,
    })

    // Scan + import in background; emit progress
    ;(async () => {
      const wins = BrowserWindow.getAllWindows()
      const send = (e: any) => wins.forEach((w) => w.webContents.send('import:progress', e))

      const scan = await scanImageFolder(input.sourceDir)
      const total = scan.images.length
      send({ projectId: project.id, done: 0, total })

      let done = 0
      for (const img of scan.images) {
        const meta = await sharp(img.path).metadata().catch(() => ({ width: null, height: null } as any))
        DatabaseService.insertImageIfMissing({
          projectId: project.id, path: img.path, filename: img.filename, hash: img.hash,
          sizeBytes: img.sizeBytes, width: meta.width ?? null, height: meta.height ?? null,
        })
        done++
        send({ projectId: project.id, done, total })
      }

      // generate thumbnails after metadata pass
      await ThumbnailService.generateBatch(
        scan.images.map((i) => ({ srcPath: i.path, hash: i.hash })),
        () => { /* could send a separate event, kept silent for now */ },
      )
      DatabaseService.refreshCovers(project.id)
    })().catch((err) => console.error('import error', err))

    return project
  })
}
