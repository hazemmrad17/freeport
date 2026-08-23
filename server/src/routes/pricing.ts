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
  <title>Pricing & Plans — Freeport</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:ital,wght@0,300;0,400;0,600;0,700;0,900;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
  <style>
    :root {
      --amber: #ffb000;
      --amber-glow: rgba(255, 176, 0, 0.3);
      --ink: #0a0a0a;
      --bg: #070709;
      --bg-card: #0e0e12;
      --bg-surface: #14141a;
      --border: rgba(240, 237, 230, 0.12);
      --border-accent: rgba(255, 176, 0, 0.4);
      --paper: #f0ede6;
      --paper-dim: rgba(240, 237, 230, 0.7);
      --paper-muted: rgba(240, 237, 230, 0.45);
      --paper-faint: rgba(240, 237, 230, 0.04);
      --chamfer: 8px;
      --font-mono: 'Chivo Mono', monospace;
      --font-display: 'Plus Jakarta Sans', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-display);
      background: var(--bg);
      color: var(--paper);
      min-height: 100vh;
      line-height: 1.5;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .scanlines {
      position: fixed; inset: 0; pointer-events: none; z-index: 9990;
      background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px);
    }
    .noise {
      position: fixed; inset: 0; pointer-events: none; z-index: 9989;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E");
      opacity: 0.45;
    }
    .site-nav {
      max-width: 1200px; margin: 0 auto; padding: 1.5rem 2rem;
      display: flex; justify-content: space-between; align-items: center;
      position: relative; z-index: 10;
    }
    .brand-logo { height: 28px; width: auto; }
    .site-nav-links { display: flex; align-items: center; gap: 1.5rem; list-style: none; }
    .site-nav-links a {
      font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700;
      color: var(--paper-dim); text-decoration: none; transition: color 0.2s;
    }
    .site-nav-links a:hover { color: var(--amber); }
    .container { max-width: 1100px; margin: 0 auto; padding: 2rem 2rem 6rem; position: relative; z-index: 1; }
    .head-wrap { text-align: center; margin-bottom: 2.5rem; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--amber); border: 1px solid rgba(255,176,0,0.3);
      padding: 0.3rem 0.75rem; background: rgba(255,176,0,0.06);
      margin-bottom: 1rem;
    }
    h1 { font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 900; letter-spacing: -0.03em; margin-bottom: 0.75rem; }
    .subtitle { color: var(--paper-dim); font-size: 1.1rem; max-width: 540px; margin: 0 auto; }
    
    .toggle { display: flex; justify-content: center; gap: 14px; margin: 2.5rem 0 3.5rem; align-items: center; }
    .toggle span { font-family: var(--font-mono); font-size: 0.85rem; color: var(--paper-muted); cursor: pointer; transition: color 0.2s; }
    .toggle span.active { color: var(--paper); font-weight: 700; }
    .switch {
      position: relative; width: 50px; height: 26px;
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: 13px; cursor: pointer; transition: all 0.2s;
    }
    .switch.on { background: rgba(255,176,0,0.2); border-color: var(--amber); }
    .switch::after {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; background: var(--paper-dim);
      border-radius: 50%; transition: transform 0.2s;
    }
    .switch.on::after { transform: translateX(24px); background: var(--amber); }
    .save-badge {
      font-family: var(--font-mono); font-size: 0.65rem; font-weight: 700;
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 2px 8px; border-radius: 3px; margin-left: 6px;
    }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 1.5rem; }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 2.5rem 2rem;
      display: flex; flex-direction: column;
      clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
      transition: border-color 0.2s, background 0.2s, transform 0.2s;
      position: relative;
    }
    .card:hover { border-color: rgba(255,176,0,0.3); transform: translateY(-3px); }
    .card.popular {
      border-color: var(--amber);
      background: rgba(255,176,0,0.04);
      box-shadow: 0 0 40px rgba(255,176,0,0.08);
    }
    .card.popular::before {
      content: 'MOST POPULAR'; position: absolute; top: -1px; right: 24px;
      background: var(--amber); color: #0a0a0a;
      font-family: var(--font-mono); font-size: 0.62rem; font-weight: 800;
      letter-spacing: 0.1em; padding: 4px 10px;
      clip-path: polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%);
    }
    .tier-name { font-size: 1.4rem; font-weight: 800; margin-bottom: 6px; }
    .tier-desc { color: var(--paper-dim); font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5; }
    .price { margin-bottom: 24px; display: flex; align-items: baseline; gap: 6px; }
    .price .amount { font-family: var(--font-mono); font-size: 2.5rem; font-weight: 900; color: var(--paper); }
    .price .period { font-family: var(--font-mono); font-size: 0.8rem; color: var(--paper-muted); }
    .features { list-style: none; margin-bottom: 28px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .features li { font-size: 0.85rem; color: var(--paper-dim); display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; }
    .features li::before { content: '✓'; color: var(--amber); font-weight: 700; flex-shrink: 0; font-family: var(--font-mono); }
    
    .btn {
      width: 100%; padding: 0.85rem 1.6rem;
      font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      cursor: pointer; transition: all 0.15s ease; border: none;
      clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
      text-align: center; text-decoration: none;
    }
    .btn-primary {
      background: var(--amber); color: #0a0a0a;
      box-shadow: 0 0 20px var(--amber-glow);
    }
    .btn-primary:hover { background: #ffbe26; transform: translateY(-2px); }
    .btn-outline {
      background: var(--paper-faint); color: var(--paper);
      border: 1px solid var(--border);
    }
    .btn-outline:hover:not(:disabled) {
      border-color: var(--amber); color: var(--amber); transform: translateY(-2px);
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .loading { text-align: center; color: var(--paper-muted); padding: 60px 0; font-family: var(--font-mono); }
    
    footer { border-top: 1px solid var(--border); padding: 3rem 0; text-align: center; color: var(--paper-muted); font-family: var(--font-mono); font-size: 0.75rem; margin-top: 4rem; }
  </style>
</head>
<body>
  <div class="scanlines"></div>
  <div class="noise"></div>

  <nav class="site-nav">
    <a href="/" aria-label="Freeport Home">
      <svg class="brand-logo" viewBox="0 0 218.38 248.89" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89" fill="#ffb000"/>
        <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41Z" fill="#ffb000"/>
        <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95Z" fill="#ffb000"/>
      </svg>
    </a>
    <ul class="site-nav-links">
      <li><a href="/#intro-freeport">How it works</a></li>
      <li><a href="/#terminal-demo">CLI</a></li>
      <li><a href="/#faq">FAQ</a></li>
      <li><a href="/login">Login</a></li>
    </ul>
  </nav>

  <div class="container">
    <div class="head-wrap">
      <div class="badge">Paddle Worldwide Billing</div>
      <h1>Simple, transparent pricing</h1>
      <p class="subtitle">Start free. Upgrade for priority throughput, zero ads, and extended quota.</p>
    </div>

    <div class="toggle">
      <span id="monthlyLabel" class="active" onclick="if(isYearly)toggleBilling()">Monthly</span>
      <div id="billingToggle" class="switch" onclick="toggleBilling()"></div>
      <span id="yearlyLabel" onclick="if(!isYearly)toggleBilling()">Yearly <span class="save-badge">Save 20%</span></span>
    </div>

    <div id="pricing" class="loading">Loading prices...</div>
  </div>

  <footer>
    Freeport © 2026 · Paddle Merchant of Record · Zero code telemetry
  </footer>

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

    function firstLineTotal(preview) {
      const total = preview?.data?.details?.lineItems?.[0]?.formattedTotals?.total;
      if (!total) {
        console.error('Unexpected PricePreview shape:', JSON.stringify(preview));
        return null;
      }
      return total;
    }

    async function fetchPrices() {
      const container = document.getElementById('pricing');
      try {
        if (!window.Paddle) {
          throw new Error('Paddle.js not loaded');
        }

        Paddle.Environment.set(PADDLE_ENV);
        Paddle.Initialize({ token: PADDLE_TOKEN });

        // Omitted when no server-side country header: Paddle auto-detects IP.
        const location = COUNTRY ? { address: { countryCode: COUNTRY } } : {};

        for (const tier of TIERS) {
          if (!tier.priceId) continue; // free / BYOK tiers have no Paddle prices

          const [monthPreview, yearPreview] = await Promise.all([
            Paddle.PricePreview({
              items: [{ priceId: tier.priceId.month, quantity: 1 }],
              ...location,
            }),
            Paddle.PricePreview({
              items: [{ priceId: tier.priceId.year, quantity: 1 }],
              ...location,
            }),
          ]);

          prices[tier.name] = {
            month: firstLineTotal(monthPreview),
            year: firstLineTotal(yearPreview),
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
      container.innerHTML = TIERS.map((tier) => {
        const isCheckout = tier.cta.kind === 'checkout' && tier.priceId;
        const price = (isCheckout && prices[tier.name] && prices[tier.name][billing]) || (tier.priceId ? '$6' : '$0');
        const popular = tier.name === 'Pro Supporter' ? ' popular' : '';
        const btnClass = tier.name === 'Pro Supporter' ? 'btn btn-primary' : 'btn btn-outline';

        let button;
        if (isCheckout) {
          const pid = tier.priceId[billing];
          button = '<button class="' + btnClass + '" data-pid="' + pid + '" onclick="openCheckout(this.dataset.pid)">' + tier.cta.label + '</button>';
        } else {
          button = '<button class="' + btnClass + '" disabled title="'
            + (tier.cta.kind === 'byok' ? 'Run: freeport --key YOUR_API_KEY' : 'Just run freeport — no signup cost')
            + '">' + tier.cta.label + '</button>';
        }

        return '<div class="card' + popular + '">' +
          '<div class="tier-name">' + tier.name + '</div>' +
          '<div class="tier-desc">' + tier.description + '</div>' +
          '<div class="price"><span class="amount">' + price + '</span>'
          + (isCheckout ? '<span class="period">' + suffix + '</span>' : '') +
          '</div>' +
          '<ul class="features">' + tier.features.map(f => '<li>' + f + '</li>').join('') + '</ul>' +
          button +
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
