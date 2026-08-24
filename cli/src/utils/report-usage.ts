import { WEBSITE_URL } from '@codebuff/sdk'

import { getAuthToken } from './auth'
import { logger } from './logger'

import type { AgentUsageData } from '@codebuff/common/types/contracts/llm'

/**
 * Best-effort reporting of real model token usage to the freeport backend
 * (/api/v1/usage/report). The CLI routes model traffic directly to the
 * provider, so the backend cannot observe usage on its own — this is what
 * feeds the cost-per-user economics view. Fire-and-forget: never throws,
 * never blocks the run.
 */
export function reportModelUsage(
  usage: AgentUsageData,
  opts: { sessionId?: string } = {},
): void {
  const token = getAuthToken()
  if (!token) return

  const url = `${WEBSITE_URL}/api/v1/usage/report`
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId: opts.sessionId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
    }),
  })
    .then((res) => {
      if (!res.ok) {
        logger.debug(
          { status: res.status },
          '[usage] Failed to report model usage',
        )
      }
    })
    .catch(() => {
      // Best-effort only.
    })
}