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
 * Verify a Paddle webhook signature and parse the event.
 * Returns null if verification fails.
 */
export async function verifyWebhookEvent(
  config: ServerConfig,
  rawBody: string,
  signature: string,
): Promise<Record<string, unknown> | null> {
  if (!config.paddleWebhookSecret) {
    console.error('[paddle] PADDLE_WEBHOOK_SECRET not configured')
    return null
  }
  try {
    const paddle = getPaddleClient(config)
    const eventData = await paddle.webhooks.unmarshal(
      rawBody,
      config.paddleWebhookSecret,
      signature,
    )
    return eventData as unknown as Record<string, unknown>
  } catch (err) {
    console.error('[paddle] Webhook verification failed', err)
    return null
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
    })
    return result.checkout?.url ?? null
  } catch (err) {
    console.error('[paddle] Failed to create checkout', err)
    return null
  }
}
