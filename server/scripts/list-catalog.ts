import { Paddle, Environment } from '@paddle/paddle-node-sdk'

const apiKey = process.env.PADDLE_API_KEY
if (!apiKey) throw new Error('PADDLE_API_KEY required')

const paddle = new Paddle(apiKey, { environment: Environment.sandbox })

console.log('--- PRODUCTS ---')
for await (const product of paddle.products.list()) {
  console.log(`${product.id}  ${product.name}  status=${product.status}`)
}

console.log('--- PRICES ---')
for await (const price of paddle.prices.list()) {
  const p = price.unitPrice as unknown as {
    amount?: string
    currencyCode?: string
  }
  const interval = price.billingCycle
    ? `${price.billingCycle.interval}/${price.billingCycle.frequency}`
    : 'one-time'
  console.log(
    `${price.id}  ${price.name}  ${p?.currencyCode} ${Number(p?.amount ?? 0) / 100}  ${interval}  product=${price.productId}  status=${price.status}`,
  )
}
