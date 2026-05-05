import { registerProjectIPC } from './projects'
import { registerImageIPC } from './images'

export function registerAllIPC() {
  registerProjectIPC()
  registerImageIPC()
  // ai/clustering/export/settings registered in later tasks
}
