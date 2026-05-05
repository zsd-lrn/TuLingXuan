import { registerProjectIPC, registerProjectCreate } from './projects'
import { registerImageIPC } from './images'
import { registerShellIPC } from './shell'
import { registerAIIPC } from './ai'

export function registerAllIPC() {
  registerProjectIPC()
  registerProjectCreate()
  registerImageIPC()
  registerShellIPC()
  registerAIIPC()
}
