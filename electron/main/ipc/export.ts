import { ipcMain } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { DatabaseService } from '../services/DatabaseService'
import { generateCSV, copyImages } from '../services/ExportService'

export function registerExportIPC() {
  ipcMain.handle('export.run', async (_e, payload: {
    projectId: string; imageIds: string[]; targetDir: string; includeCsv: boolean
  }) => {
    const images = payload.imageIds.map((id) => DatabaseService.getImage(id)).filter(Boolean) as any[]
    const r = await copyImages(images.map((i) => ({ path: i.path, filename: i.filename })), payload.targetDir)
    if (payload.includeCsv) {
      const csv = generateCSV(images)
      writeFileSync(join(payload.targetDir, 'tulingxuan-export.csv'), csv, 'utf-8')
    }
    return r
  })
}
