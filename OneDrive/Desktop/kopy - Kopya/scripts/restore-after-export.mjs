import { existsSync, renameSync } from 'fs'
import { resolve } from 'path'

const root = resolve(process.cwd())
const apiDir = resolve(root, 'app', 'api')
const disabledDir = resolve(root, 'app', '__api_disabled__')

try {
  if (existsSync(disabledDir)) {
    renameSync(disabledDir, apiDir)
    console.log(`[static-export] Restored API routes: ${disabledDir} -> ${apiDir}`)
  }
} catch (err) {
  console.error('[static-export] Failed to restore API routes:', err)
}
