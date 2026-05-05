import { ipcMain } from 'electron'
import { DatabaseService } from '../services/DatabaseService'
import { ImageQueryParamsSchema } from '@shared/types'

export function registerImageIPC() {
  ipcMain.handle('images.query', (_e, raw: unknown) => {
    const params = ImageQueryParamsSchema.parse(raw)
    return DatabaseService.queryImages(params)
  })
  ipcMain.handle('images.get', (_e, id: string) => DatabaseService.getImage(id))
  ipcMain.handle('images.updateDecision', (_e, payload: any) => {
    DatabaseService.updateDecision(payload)
    DatabaseService.touchProject(payload.projectId ?? '')
  })
  ipcMain.handle('images.aggregateTags', (_e, projectId: string) =>
    DatabaseService.aggregateTags(projectId),
  )
}
