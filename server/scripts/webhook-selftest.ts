import { createHmac } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createApp } from '../src/app'
import { loadConfig } from '../src/config'
import { Database } from 'bun:sqlite'

const secret = process.env.PADDLE_WEBHOOK_SECRET
if (!secret) throw new Error('PADDLE_WEBHOOK_SECRET missing')

function sign(payload: object) {
  const raw = JSON.stringify(payload)
  const t = Math.floor(Date.now() / 1000).toString()
  const h = createHmac('sha256', secret!).update(`${t}:${raw}`).digest('hex')
  return { raw, signature: `ts=${t};h1=${h}` }
}

const customerCreatedEvent = {
  event_id: 'evt_cust_' + Date.now(),
  event_type: 'customer.created',
  occurred_at: new Date().toISOString(),
  data: {
    id: 'cust_selftest',
    email: 'selftest@example.com',
    name: 'Selftest',
    status: 'active',
  },
}

const txnCompletedEvent = {
  event_id: 'evt_txn_' + Date.now(),
  event_type: 'transaction.completed',
  occurred_at: new Date().toISOString(),
  data: {
    id: 'txn_selftest',
    status: 'completed',
    customer_id: 'cust_selftest',
    subscription_id: 'sub_selftest',
    custom_data: null,
    items: [
      {
        quantity: 1,
        price: {
          id: 'pri_01m0jk57xcf1q8t3j6shn9eye1',
          product_id: 'pro_01m0jk2gdqqthke7ygf2ctycst',
          type: 'standard',
          unit_price: { amount: '600', currency_code: 'USD' },
          unit_price_overrides: [],
          quantity: { minimum: 1, maximum: 100 },
        },
        product: { id: 'pro_01m0jk2gdqqthke7ygf2ctycst', name: 'Pro Supporter' },
      },
    ],
    details: {
      tax_rates_used: [],
      totals: { subtotal: '600', tax: null, total: '600' },
      line_items: [
        {
          price: {
            id: 'pri_01m0jk57xcf1q8t3j6shn9eye1',
            product_id: 'pro_01m0jk2gdqqthke7ygf2ctycst',
            type: 'standard',
            unit_price: { amount: '600', currency_code: 'USD' },
            quantity: { minimum: 1, maximum: 100 },
          },
          quantity: 1,
          totals: { subtotal: '600', tax: null, total: '600' },
        },
      ],
    },
    payments: [],
  },
}

const tmp = mkdtempSync(path.join(tmpdir(), 'freeport-selftest-'))
const config = loadConfig({ dbPath: path.join(tmp, 'selftest.db') })
const app = createApp(config)

const custSigned = sign(customerCreatedEvent)
const custResp = await app.request('/api/paddle/webhook', {
  method: 'POST',
  headers: { 'paddle-signature': custSigned.signature, 'Content-Type': 'application/json' },
  body: custSigned.raw,
})
console.log('customer.created status:', custResp.status, 'body:', JSON.stringify(await custResp.json()))

const txnSigned = sign(txnCompletedEvent)
const txnResp = await app.request('/api/paddle/webhook', {
  method: 'POST',
  headers: { 'paddle-signature': txnSigned.signature, 'Content-Type': 'application/json' },
  body: txnSigned.raw,
})
console.log('transaction.completed status:', txnResp.status, 'body:', JSON.stringify(await txnResp.json()))

const db = new Database(path.join(tmp, 'selftest.db'), { readonly: true })
console.log('customers:', JSON.stringify(db.query('SELECT customer_id, user_id, email FROM customers').all()))
console.log(
  'subscriptions:',
  JSON.stringify(db.query('SELECT user_id, paddle_subscription_id, status, plan, price_id FROM subscriptions').all()),
)
