#!/usr/bin/env bun

/**
 * FREEPORT CLI build script.
 *
 * Wraps the existing CLI build-binary.ts with FREEPORT_MODE=true
 * to produce a free-only variant of the Codebuff CLI.
 *
 * Usage:
 *   bun FREEPORT/cli/build.ts <version>
 *
 * Example:
 *   bun FREEPORT/cli/build.ts 1.0.0
 */

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

const version = process.argv[2]
if (!version) {
  console.error('Usage: bun FREEPORT/cli/build.ts <version>')
  process.exit(1)
}

console.log(`Building FREEPORT v${version}...`)

const result = spawnSync(
  'bun',
  ['cli/scripts/build-binary.ts', 'FREEPORT', version],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      FREEPORT_MODE: 'true',
    },
  },
)

if (result.status !== 0) {
  console.error('FREEPORT build failed')
  process.exit(result.status ?? 1)
}

console.log(`✅ FREEPORT v${version} built successfully`)
