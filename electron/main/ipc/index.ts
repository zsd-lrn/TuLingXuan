import { registerProjectIPC, registerProjectCreate } from './projects'
import { registerImageIPC } from './images'
import { registerShellIPC } from './shell'
import { registerAIIPC } from './ai'
import { registerClusteringIPC } from './clustering'
import { registerExportIPC } from './export'

export function registerAllIPC() {
  registerProjectIPC()
  registerProjectCreate()
  registerImageIPC()
  registerShellIPC()
  registerAIIPC()
  registerClusteringIPC()
  registerExportIPC()
}
