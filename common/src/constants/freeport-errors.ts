/** Provider billing failures observed from CrofAI, OpenRouter, and similar APIs. */
export const FREEPORT_PROVIDER_USAGE_ERROR_PATTERN =
  /\b(?:(?:not enough|insufficient|out of)\s+credits?|(?:add|refill|top up)\s+(?:more\s+)?credits?)\b/i

/** Shared copy keeps every FREEPORT surface clear that the user is not billed. */
export const FREEPORT_PROVIDER_USAGE_MESSAGE =
  'FREEPORT ran out of provider usage and needs a refill. This is on us, not your account.'
