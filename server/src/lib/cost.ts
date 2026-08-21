export interface TokenCost {
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
}

export interface Pricing {
  inputUsdPerMToken: number
  outputUsdPerMToken: number
}

/**
 * Compute the DeepInfra cost for a token usage receipt.
 * Cached input tokens are billed at the input rate (DeepInfra's discount is
 * applied upstream and reflected in the flat per-token price we model).
 */
export function computeCost(
  usage: {
    inputTokens?: number
    outputTokens?: number
    cachedInputTokens?: number
  },
  pricing: Pricing,
): TokenCost {
  const inputTokens = usage.inputTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  const cachedInputTokens = usage.cachedInputTokens ?? 0
  const costUsd =
    ((inputTokens + cachedInputTokens) / 1_000_000) *
      pricing.inputUsdPerMToken +
    (outputTokens / 1_000_000) * pricing.outputUsdPerMToken
  return { inputTokens, outputTokens, cachedInputTokens, costUsd }
}