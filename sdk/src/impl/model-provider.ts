/**
 * Builds the language model for freeport: routes directly to DeepInfra's
 * OpenAI-compatible endpoint, bypassing the Codebuff/Freebuff backend entirely.
 *
 * Model: DeepSeek V4 Flash (deepseek/deepseek-chat-v3-0324)
 * Provider: DeepInfra  —  https://deepinfra.com
 * Pricing: $0.10/M input · $0.20/M output (flat, no peak surcharge)
 *
 * Auth: set DEEPINFRA_API_KEY in your environment.
 */

import { isTransientNetworkError } from '@codebuff/common/util/error'
import {
  OpenAICompatibleChatLanguageModel,
  VERSION,
} from '@codebuff/llm-providers/openai-compatible'
import { APICallError } from 'ai'

import type { LanguageModel } from 'ai'

// ---------------------------------------------------------------------------
// DeepInfra configuration
// ---------------------------------------------------------------------------

const DEEPINFRA_BASE_URL = 'https://api.deepinfra.com/v1/openai'

/**
 * Default model: DeepSeek V4 Flash on DeepInfra.
 * Override at runtime via FREEPORT_MODEL env var (any DeepInfra model string).
 */
export const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Flash-0731'

/** Read the DeepInfra API key from the environment. */
export function getDeepInfraApiKey(): string | undefined {
  return process.env['DEEPINFRA_API_KEY']
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ModelRequestParams {
  /** Unused — kept for API compatibility with the original SDK. */
  apiKey?: string
  /** Model ID in DeepInfra format, e.g. "deepseek/deepseek-chat-v3-0324". */
  model?: string
  /** Unused — kept for API compatibility. */
  userId?: string
}

/**
 * Notification hook for free-mode capacity deferrals (kept for API compat).
 * DeepInfra doesn't send these, but callers may still register a listener.
 */
export type FreeModeCapacityDeferral = { retryAfterSeconds: number }

let freeModeCapacityDeferralListener:
  | ((deferral: FreeModeCapacityDeferral) => void)
  | null = null

export function setFreeModeCapacityDeferralListener(
  listener: ((deferral: FreeModeCapacityDeferral) => void) | null,
): void {
  freeModeCapacityDeferralListener = listener
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Wrap global fetch so transient connection failures are rethrown as
 * retryable APICallErrors. Same logic as the original Freebuff SDK.
 */
function fetchWithRetryableNetworkErrors(
  ...args: Parameters<typeof globalThis.fetch>
): ReturnType<typeof globalThis.fetch> {
  return globalThis
    .fetch(...args)
    .catch((error: unknown) => {
      if (isTransientNetworkError(error)) {
        const input = args[0]
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url
        throw new APICallError({
          message: error instanceof Error ? error.message : String(error),
          cause: error,
          url,
          requestBodyValues: {},
          isRetryable: true,
        })
      }
      throw error
    })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the language model for a request, routed through DeepInfra.
 *
 * The `apiKey` and `userId` params are accepted but ignored — auth comes
 * from the DEEPINFRA_API_KEY environment variable.
 */
export function getModelForRequest({
  model = DEFAULT_MODEL,
}: ModelRequestParams = {}): LanguageModel {
  const apiKey = getDeepInfraApiKey() ?? ''

  if (!apiKey) {
    // Warn loudly — the agent won't work without a key.
    console.warn(
      '[freeport] WARNING: DEEPINFRA_API_KEY is not set. ' +
        'Requests to DeepInfra will fail with 401. ' +
        'Set DEEPINFRA_API_KEY in your environment before running freeport.',
    )
  }

  return new OpenAICompatibleChatLanguageModel(model, {
    provider: 'freeport',
    url: ({ path: endpoint }: { path: string }) =>
      `${DEEPINFRA_BASE_URL}${endpoint}`,
    headers: () => ({
      Authorization: `Bearer ${apiKey}`,
      'user-agent': `freeport/1.0 ai-sdk/openai-compatible/${VERSION}`,
      'Content-Type': 'application/json',
    }),
    // Cast: Bun's fetch type declares extra helpers the AI SDK never uses.
    fetch: fetchWithRetryableNetworkErrors as typeof globalThis.fetch,
    // DeepSeek V3 does not guarantee structured output / JSON schema mode.
    supportsStructuredOutputs: false,
  })
}
