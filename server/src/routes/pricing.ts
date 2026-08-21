import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'
import { TIERS } from '../lib/tiers'

export const pricingRoutes = new Hono<AppBindings>()

function pricingPageHtml(params: {
  paddleClientToken: string
  paddleEnv: string
  country: string | null
  tiersJson: string
}): string {
  const { paddleClientToken, paddleEnv, country, tiersJson } = params
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pricing — MyCLI</title>
  <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ededed; min-height: 100vh; }
    .container { max-width: 1100px; margin: 0 auto; padding: 60px 24px; }
    h1 { font-size: 2.5rem; font-weight: 700; text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #888; font-size: 1.1rem; margin-bottom: 40px; }
    .toggle { display: flex; justify-content: center; gap: 12px; margin-bottom: 48px; align-items: center; }
    .toggle label { font-size: 0.95rem; color: #aaa; cursor: pointer; }
    .toggle label.active { color: #fff; font-weight: 600; }
    .switch { position: relative; width: 48px; height: 26px; background: #333; border-radius: 13px; cursor: pointer; transition: background 0.2s; }
    .switch.on { background: #6366f1; }
    .switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
    .switch.on::after { transform: translateX(22px); }
    .badge { display: inline-block; background: #6366f1; color: #fff; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
    .card { background: #141414; border: 1px solid #262626; border-radius: 16px; padding: 32px; display: flex; flex-direction: column; transition: border-color 0.2s; }
    .card:hover { border-color: #6366f1; }
    .card.popular { border-color: #6366f1; position: relative; }
    .card.popular::before { content: 'MOST POPULAR'; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #6366f1; color: #fff; font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 4px; letter-spacing: 0.5px; }
    .tier-name { font-size: 1.25rem; font-weight: 600; margin-bottom: 4px; }
    .tier-desc { color: #888; font-size: 0.9rem; margin-bottom: 24px; }
    .price { margin-bottom: 24px; }
    .price .amount { font-size: 2.5rem; font-weight: 700; }
    .price .period { color: #888; font-size: 0.9rem; }
    .features { list-style: none; margin-bottom: 32px; flex: 1; }
    .features li { padding: 8px 0; font-size: 0.9rem; color: #ccc; display: flex; align-items: center; gap: 8px; }
    .features li::before { content: '\\2713'; color: #6366f1; font-weight: 700; }
    .btn { width: 100%; padding: 12px 24px; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-outline { background: transparent; color: #ededed; border: 1px solid #333; }
    .btn-outline:hover { border-color: #6366f1; }
    .loading { text-align: center; color: #888; padding: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Simple, transparent pricing</h1>
    <p class="subtitle">Start free. Upgrade when you need more.</p>

    <div class="toggle">
      <span id="monthlyLabel" class="active">Monthly</span>
      <div id="billingToggle" class="switch" onclick="toggleBilling()"></div>
      <span id="yearlyLabel">Yearly <span class="badge">Save 20%</span></span>
    </div>

    <div id="pricing" class="loading">Loading prices...</div>
  </div>

  <script>
    const PADDLE_TOKEN = ${JSON.stringify(paddleClientToken)};
    const PADDLE_ENV = ${JSON.stringify(paddleEnv)};
    const COUNTRY = ${JSON.stringify(country)};
    const TIERS = ${tiersJson};

    let isYearly = false;
    let prices = {};

    function toggleBilling() {
      isYearly = !isYearly;
      document.getElementById('billingToggle').classList.toggle('on', isYearly);
      document.getElementById('monthlyLabel').classList.toggle('active', !isYearly);
      document.getElementById('yearlyLabel').classList.toggle('active', isYearly);
      render();
    }

    function formatPrice(price) {
      return price.formattedTotals.total;
    }

    async function fetchPrices() {
      const container = document.getElementById('pricing');
      try {
        if (!window.Paddle) {
          throw new Error('Paddle.js not loaded');
        }

        Paddle.Environment.set(PADDLE_ENV);
        Paddle.Initialize({ token: PADDLE_TOKEN });

        for (const tier of TIERS) {
          const monthPriceId = tier.priceId.month;
          const yearPriceId = tier.priceId.year;

          const monthPreview = await Paddle.PricePreview({
            priceId: monthPriceId,
            ...(COUNTRY ? { country: COUNTRY } : {}),
          });
          const yearPreview = await Paddle.PricePreview({
            priceId: yearPriceId,
            ...(COUNTRY ? { country: COUNTRY } : {}),
          });

          prices[tier.name] = {
            month: monthPreview,
            year: yearPreview,
          };
        }

        render();
      } catch (err) {
        console.error('Failed to load prices:', err);
        container.innerHTML = '<div class="loading">Failed to load prices. Please try again.</div>';
      }
    }

    function render() {
      const container = document.getElementById('pricing');
      const billing = isYearly ? 'year' : 'month';
      const suffix = isYearly ? '/yr' : '/mo';

      container.className = 'grid';
      container.innerHTML = TIERS.map((tier, i) => {
        const priceData = prices[tier.name];
        const price = priceData ? formatPrice(priceData[billing]) : '---';
        const popular = tier.name === 'Pro' ? ' popular' : '';
        const btnClass = tier.name === 'Pro' ? 'btn btn-primary' : 'btn btn-outline';

        return '<div class="card' + popular + '">' +
          '<div class="tier-name">' + tier.name + '</div>' +
          '<div class="tier-desc">' + tier.description + '</div>' +
          '<div class="price"><span class="amount">' + price + '</span><span class="period">' + suffix + '</span></div>' +
          '<ul class="features">' + tier.features.map(f => '<li>' + f + '</li>').join('') + '</ul>' +
          '<button class="' + btnClass + '" onclick="openCheckout(\'' + tier.priceId[billing] + '\')">Subscribe</button>' +
        '</div>';
      }).join('');
    }

    function openCheckout(priceId) {
      Paddle.Checkout.open({
        settings: {
          displayMode: 'overlay',
          variant: 'one-page',
          successUrl: window.location.origin + '/welcome',
        },
        items: [{ priceId: priceId, quantity: 1 }],
      });
    }

    fetchPrices();
  </script>
</body>
</html>`
}

pricingRoutes.get('/pricing', (c) => {
  const config = c.get('config')

  if (!config.paddleClientToken) {
    c.status(503)
    return c.text('Paddle not configured. Set PADDLE_CLIENT_TOKEN.', 503)
  }

  // Country detection from request headers (Vercel, Cloudflare, etc.)
  const country =
    c.req.header('x-vercel-ip-country') ??
    c.req.header('cf-ipcountry') ??
    c.req.header('x-country-code') ??
    null

  const html = pricingPageHtml({
    paddleClientToken: config.paddleClientToken,
    paddleEnv: config.paddleEnv,
    country,
    tiersJson: JSON.stringify(TIERS),
  })

  return c.html(html)
})
