import { existsSync, renameSync } from 'fs'
import { resolve } from 'path'

const root = resolve(process.cwd())
const apiDir = resolve(root, 'app', 'api')
const disabledDir = resolve(root, 'app', '__api_disabled__')

try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, disabledDir)
    console.log(`[static-export] Temporarily disabled API routes: ${apiDir} -> ${disabledDir}`)
  } else {
    console.log('[static-export] No app/api directory found; nothing to disable')
  }
} catch (err) {
  console.error('[static-export] Failed to disable API routes:', err)
  process.exit(0) // Do not hard-fail; allow export to proceed
}
