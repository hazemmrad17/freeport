import { flushAnalytics } from './analytics'
import { IS_FREEPORT } from './constants'
import { stopEngagementTracking } from './engagement'
import { endfreeportSessionBestEffort } from './freeport-session-api'
import { drainClientLogs } from './log-shipper'
import { withTimeout } from './terminal-color-detection'

const EXIT_CLEANUP_TIMEOUT_MS = 1_000

type ExitCliDependencies = {
  isFREEPORT: boolean
  cleanupLocal: () => void
  stopEngagementTracking: () => void
  flushAnalytics: () => Promise<void>
  drainClientLogs: () => Promise<void>
  endfreeportSession: () => Promise<void>
  waitForRemoteCleanup: (tasks: Promise<void>[]) => Promise<void>
  exit: (code: number) => void
}

let localExitCleanup: (() => void) | undefined

/** Register the synchronous renderer/terminal finalizer once it is available. */
export function registerExitCleanup(cleanup: () => void): void {
  localExitCleanup = cleanup
}

/**
 * Build an idempotent exit request. Exported for dependency-injected tests;
 * production uses the singleton below so competing exit triggers converge.
 */
export function createExitCliCleanly(deps: ExitCliDependencies) {
  let exitPromise: Promise<void> | undefined

  return (exitCode = 0): Promise<void> => {
    if (exitPromise) return exitPromise

    // Start on the next microtask so exitPromise is assigned before any cleanup
    // callback can re-enter this function.
    exitPromise = Promise.resolve().then(async () => {
      try {
        deps.cleanupLocal()
      } catch {
        // Cleanup is best-effort; never strand the process in a half-exited UI.
      }
      if (deps.isFREEPORT) {
        try {
          deps.stopEngagementTracking()
        } catch {}
      }

      const remoteTasks = [
        Promise.resolve().then(deps.flushAnalytics),
        Promise.resolve().then(deps.drainClientLogs),
      ]
      if (deps.isFREEPORT) {
        remoteTasks.push(Promise.resolve().then(deps.endfreeportSession))
      }

      try {
        await deps.waitForRemoteCleanup(remoteTasks)
      } finally {
        deps.exit(exitCode)
      }
    })

    return exitPromise
  }
}

export const exitCliCleanly = createExitCliCleanly({
  isFREEPORT: IS_FREEPORT,
  cleanupLocal: () => localExitCleanup?.(),
  stopEngagementTracking,
  flushAnalytics,
  drainClientLogs,
  endfreeportSession: endfreeportSessionBestEffort,
  waitForRemoteCleanup: async (tasks) => {
    await withTimeout(
      Promise.allSettled(tasks),
      EXIT_CLEANUP_TIMEOUT_MS,
      undefined,
    )
  },
  exit: (code) => process.exit(code),
})
