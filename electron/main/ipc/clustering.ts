import { ipcMain } from 'electron'
import { ClusteringService } from '../services/ClusteringService'
import { DatabaseService } from '../services/DatabaseService'

export function registerClusteringIPC() {
  ipcMain.handle('clustering.compute', (_e, projectId: string) => ClusteringService.compute(projectId))
  ipcMain.handle('clustering.list',    (_e, projectId: string) => DatabaseService.listClusters(projectId))
}
