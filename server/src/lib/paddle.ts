import { Paddle, Environment } from '@paddle/paddle-node-sdk'

import type { ServerConfig } from '../config'

let paddleClient: Paddle | null = null

export function getPaddleClient(config: ServerConfig): Paddle {
  if (paddleClient) return paddleClient
  if (!config.paddleApiKey) {
    throw new Error('PADDLE_API_KEY is required for Paddle integration')
  }
  paddleClient = new Paddle(config.paddleApiKey, {
    environment:
      config.paddleEnv === 'production'
        ? Environment.production
        : Environment.sandbox,
  })
  return paddleClient
}

/**
 * Verify a Paddle webhook signature (HMAC) without parsing the event.
 */
export async function verifySignatureOnly(
  config: ServerConfig,
  rawBody: string,
  signature: string,
): Promise<boolean> {
  if (!config.paddleWebhookSecret) {
    console.error('[paddle] PADDLE_WEBHOOK_SECRET not configured')
    return false
  }
  try {
    const paddle = getPaddleClient(config)
    return await paddle.webhooks.isSignatureValid(
      rawBody,
      config.paddleWebhookSecret,
      signature,
    )
  } catch (err) {
    console.error('[paddle] Signature check failed', err)
    return false
  }
}

/**
 * Verify a Paddle webhook signature and parse the event.
 * Returns null when the signature is invalid.
 * Throws an error with code VERIFIED_UNPARSEABLE when the signature is valid
 * but the SDK entities cannot represent the payload — callers should ACK that
 * distinctly rather than treating it as tampering.
 */
export async function verifyWebhookEvent(
  config: ServerConfig,
  rawBody: string,
  signature: string,
): Promise<Record<string, unknown> | null> {
  const valid = await verifySignatureOnly(config, rawBody, signature)
  if (!valid) return null

  try {
    const paddle = getPaddleClient(config)
    const eventData = await paddle.webhooks.unmarshal(
      rawBody,
      config.paddleWebhookSecret,
      signature,
    )
    return eventData as unknown as Record<string, unknown>
  } catch (err) {
    const parseError = new Error('verified_but_unparseable')
    ;(parseError as Error & { code?: string }).code = 'VERIFIED_UNPARSEABLE'
    parseError.cause = err
    throw parseError
  }
}

/**
 * Create a Paddle checkout URL for a subscription.
 * Returns the checkout URL or null on failure.
 */
export async function createCheckoutUrl(
  config: ServerConfig,
  params: {
    userId: string
    email: string
    productName: string
    priceUsd: number
  },
): Promise<string | null> {
  try {
    const paddle = getPaddleClient(config)
    const result = await paddle.transactions.create({
      items: [
        {
          priceId: params.productName,
          quantity: 1,
        },
      ],
      // Links the resulting webhook events back to the local user.
      customData: { userId: params.userId },
    })
    return result.checkout?.url ?? null
  } catch (err) {
    console.error('[paddle] Failed to create checkout', err)
    return null
  }
}

/**
 * Mint a Paddle-hosted customer portal session so the user can manage their
 * payment method, cancel, or view invoices without us building any of it.
 */
export async function createPortalSessionUrl(
  config: ServerConfig,
  customerId: string,
  subscriptionIds: string[] = [],
): Promise<string | null> {
  try {
    const paddle = getPaddleClient(config)
    const session = await paddle.customerPortalSessions.create(
      customerId,
      subscriptionIds,
    )
    return session.urls?.general?.overview ?? null
  } catch (err) {
    console.error('[paddle] Failed to create portal session', err)
    return null
  }
}
