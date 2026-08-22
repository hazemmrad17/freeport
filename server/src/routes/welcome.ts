import { Hono } from 'hono'

import type { AppBindings } from '../middleware/auth'

export const welcomeRoutes = new Hono<AppBindings>()

welcomeRoutes.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freeport — Autonomous AI Coding Agent for Your Terminal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #f4f4f5;
      min-height: 100vh;
      line-height: 1.5;
      overflow-x: hidden;
    }
    .hero-glow {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 700px;
      height: 400px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(168, 85, 247, 0.08) 50%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    .nav {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 10;
    }
    .brand {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }
    .brand-badge {
      font-size: 0.7rem;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .nav-link {
      color: #a1a1aa;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-link:hover { color: #fff; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    }
    .btn-primary {
      background: #6366f1;
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }
    .btn-outline {
      background: rgba(255, 255, 255, 0.05);
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 24px 80px;
      position: relative;
      z-index: 1;
    }
    .hero {
      text-align: center;
      max-width: 780px;
      margin: 40px auto 60px;
    }
    .tagline {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(39, 39, 42, 0.7);
      border: 1px solid rgba(63, 63, 70, 0.6);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.825rem;
      color: #d4d4d8;
      margin-bottom: 24px;
      backdrop-filter: blur(12px);
    }
    .tagline-dot {
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
    }
    h1 {
      font-size: 3.25rem;
      font-weight: 800;
      letter-spacing: -1.5px;
      line-height: 1.15;
      margin-bottom: 20px;
      background: linear-gradient(180deg, #ffffff 0%, #a1a1aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.15rem;
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 36px;
      max-width: 640px;
      margin-left: auto;
      margin-right: auto;
    }
    .cta-group {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 48px;
    }
    .terminal-box {
      background: #121215;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 16px 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      color: #38bdf8;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    .terminal-box span { color: #a1a1aa; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
      margin-top: 60px;
    }
    .feature-card {
      background: #121215;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 28px;
      transition: all 0.2s ease;
    }
    .feature-card:hover {
      border-color: rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    .icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      margin-bottom: 18px;
    }
    .feature-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .feature-desc {
      font-size: 0.9rem;
      color: #a1a1aa;
      line-height: 1.6;
    }
    footer {
      border-top: 1px solid #1f1f23;
      padding: 32px 24px;
      text-align: center;
      color: #71717a;
      font-size: 0.85rem;
      margin-top: 80px;
    }
  </style>
</head>
<body>
  <div class="hero-glow"></div>

  <nav class="nav">
    <a href="/" class="brand">
      FREEPORT <span class="brand-badge">v1.0</span>
    </a>
    <div class="nav-links">
      <a href="/pricing" class="nav-link">Pricing</a>
      <a href="/login" class="nav-link">Log In</a>
      <a href="/pricing" class="btn btn-primary">Get Started</a>
    </div>
  </nav>

  <main class="container">
    <div class="hero">
      <div class="tagline">
        <div class="tagline-dot"></div>
        Built for developers worldwide &middot; Local payment rails ready
      </div>
      <h1>Full-mode CLI coding agent.<br>No artificial payment walls.</h1>
      <p class="subtitle">
        Freeport unlocks real autonomous coding agent sessions directly in your terminal. Generous daily reset free tier funded by sponsors, plus local payment rails when you are ready to upgrade.
      </p>

      <div class="cta-group">
        <div class="terminal-box">
          <span>$</span> npx @freeport/cli
        </div>
        <a href="/pricing" class="btn btn-primary" style="padding: 14px 28px; font-size: 1rem;">View Pricing &amp; Plans</a>
      </div>
    </div>

    <div class="grid">
      <div class="feature-card">
        <div class="icon">&#9889;</div>
        <h3 class="feature-title">Generous Free Tier with Daily Resets</h3>
        <p class="feature-desc">
          3 full 1-hour sessions every single day, resetting daily instead of locking you out for weeks. Non-intrusive terminal sponsor line keeps it completely free.
        </p>
      </div>

      <div class="feature-card">
        <div class="icon">&#127758;</div>
        <h3 class="feature-title">Local Payments That Actually Work</h3>
        <p class="feature-desc">
          No international card? No problem. Upgrade seamlessly via Paddle supporting global and localized payment methods across MENA, Africa, Asia, and Latin America.
        </p>
      </div>

      <div class="feature-card">
        <div class="icon">&#128273;</div>
        <h3 class="feature-title">BYOK &amp; High Performance Models</h3>
        <p class="feature-desc">
          Powered by ultra-fast DeepSeek V4 Flash &amp; Pro models via DeepInfra. Bring your own keys anytime with zero session limits and zero ads.
        </p>
      </div>
    </div>
  </main>

  <footer>
    <p>Freeport &copy; 2026. Open source CLI powered by Apache-2.0. Transparent unit economics.</p>
  </footer>
</body>
</html>`)
})

welcomeRoutes.get('/welcome', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Pro — Freeport</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ededed; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { text-align: center; max-width: 520px; padding: 48px 32px; }
    .check { width: 64px; height: 64px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 2rem; }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
    p { color: #888; font-size: 1rem; line-height: 1.6; margin-bottom: 8px; }
    .next { background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin-top: 28px; text-align: left; }
    .next h2 { font-size: 0.85rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    code { background: #262626; padding: 2px 8px; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>You're a Pro Supporter</h1>
    <p>Payment received. Your subscription is active:</p>
    <p><strong>6 sessions/day &middot; priority routing &middot; zero ads</strong></p>
    <div class="next">
      <h2>Next step</h2>
      <p>Log in from the CLI with the same email to pick up your Pro access instantly.</p>
      <p style="margin-top:8px"><code>freeport</code> &rarr; sign in &rarr; done.</p>
    </div>
  </div>
</body>
</html>`)
})
