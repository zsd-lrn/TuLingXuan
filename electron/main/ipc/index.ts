import { registerProjectIPC, registerProjectCreate } from './projects'
import { registerImageIPC } from './images'
import { registerShellIPC } from './shell'

export function registerAllIPC() {
  registerProjectIPC()
  registerProjectCreate()
  registerImageIPC()
  registerShellIPC()
}
