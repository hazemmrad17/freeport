import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, '../../..')

export function getFREEPORTBinaryPath(): string {
  if (process.env.FREEPORT_BINARY) {
    return resolve(process.env.FREEPORT_BINARY)
  }
  return resolve(REPO_ROOT, 'cli/bin/FREEPORT')
}

export function requireFREEPORTBinary(): string {
  const binaryPath = getFREEPORTBinaryPath()
  if (!existsSync(binaryPath)) {
    throw new Error(
      `FREEPORT binary not found at ${binaryPath}. ` +
        'Build with: bun FREEPORT/cli/build.ts <version>',
    )
  }
  return binaryPath
}
