import { ipcMain, BrowserWindow } from 'electron'
import { basename, join } from 'path'
import { existsSync, unlinkSync, readdirSync } from 'fs'
import sharp from 'sharp'
import { DatabaseService } from '../services/DatabaseService'
import { scanImageFolder } from '../services/FileService'
import { ThumbnailService } from '../services/ThumbnailService'
import { getOrCreateQueue } from '../services/AnalysisQueue'
import { aiCacheDir } from '../util/paths'

export function registerProjectIPC() {
  ipcMain.handle('projects.list', () => DatabaseService.listProjects())
  ipcMain.handle('projects.get',  (_e, id: string) => DatabaseService.getProject(id))
  ipcMain.handle('projects.delete', (_e, id: string) => {
    // Collect thumb / ai-cache files to delete BEFORE the cascade kills the rows
    const exclusiveHashes = DatabaseService.getProjectExclusiveHashes(id)
    DatabaseService.deleteProject(id)
    let thumbCleaned = 0, cacheCleaned = 0
    const cdir = aiCacheDir()
    let cacheFiles: string[] = []
    try { cacheFiles = readdirSync(cdir) } catch { /* dir gone */ }
    for (const hash of exclusiveHashes) {
      const tp = ThumbnailService.thumbPath(hash)
      if (existsSync(tp)) { try { unlinkSync(tp); thumbCleaned++ } catch {} }
      // ai cache files are <hash>-<promptVersion>.json
      for (const f of cacheFiles) {
        if (f.startsWith(hash + '-')) {
          try { unlinkSync(join(cdir, f)); cacheCleaned++ } catch {}
        }
      }
    }
    console.log(`[projects.delete] id=${id} thumbCleaned=${thumbCleaned} aiCacheCleaned=${cacheCleaned}`)
    return { thumbCleaned, cacheCleaned }
  })
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

      // Auto-start AI analysis once import is fully done. The previous flow relied on
      // the renderer to poke ai.start after mount, but the renderer racing with import
      // (and missing import:progress events) meant ai.start ran with jobs=0 and the
      // queue idled forever. Kicking the queue from main is race-free.
      const pending = DatabaseService.listPendingImages(project.id)
      if (pending.length) {
        const q = getOrCreateQueue(project.id)
        q.enqueue(pending.map((p, idx) => ({ imageId: p.id, path: p.path, hash: p.hash, priority: 100 - idx })))
        q.run().catch((err) => console.error('AI queue error', err))
      }
    })().catch((err) => console.error('import error', err))

    return project
  })
}
