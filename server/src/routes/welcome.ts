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
  <meta name="description" content="A complete AI coding agent powered by DeepSeek V4 that executes entirely on your machine. Daily reset quotas, zero code telemetry, and local checkout worldwide.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:ital,wght@0,300;0,400;0,600;0,700;0,900;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* ─── DESIGN TOKENS ─── */
    :root {
      --hero-bg: #ffb000;
      --hero-glow: rgba(255, 176, 0, 0.35);
      --red: #ed462d;
      --red-glow: rgba(237, 70, 45, 0.35);
      --ink: #0a0a0a;
      --bg: #0a0a0a;
      --paper: #f0ede6;
      --paper-dim: rgba(240, 237, 230, 0.7);
      --paper-45: rgba(240, 237, 230, 0.45);
      --paper-20: rgba(240, 237, 230, 0.2);
      --paper-06: rgba(240, 237, 230, 0.06);
      --paper-faint: rgba(240, 237, 230, 0.04);
      --border: rgba(240, 237, 230, 0.12);
      --border-accent: rgba(255, 176, 0, 0.4);
      --text-muted: rgba(240, 237, 230, 0.5);
      --text-faint: rgba(240, 237, 230, 0.25);
      --amber: #ffb000;
      --amber-glow: rgba(255, 176, 0, 0.3);
      --green: #22c55e;
      --blue: #38bdf8;
      --chamfer: 8px;
      --font-mono: 'Chivo Mono', monospace;
      --font-display: 'Plus Jakarta Sans', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--paper);
      font-family: var(--font-display);
      line-height: 1.5;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* ─── OVERLAYS ─── */
    .scanlines {
      position: fixed; inset: 0; pointer-events: none; z-index: 9990;
      background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px);
    }
    .noise {
      position: fixed; inset: 0; pointer-events: none; z-index: 9989;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E");
      opacity: 0.45;
    }

    /* ─── BADGE ─── */
    .badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--amber); border: 1px solid rgba(255, 176, 0, 0.3);
      padding: 0.3rem 0.75rem; background: rgba(255, 176, 0, 0.06);
    }
    .badge.red {
      color: var(--red); border-color: rgba(237, 70, 45, 0.25);
      background: rgba(237, 70, 45, 0.06);
    }

    /* ─── BUTTONS ─── */
    .btn-chamfer {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      font-family: var(--font-mono); font-size: 0.82rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none;
      padding: 0.85rem 1.8rem; cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
      border: none;
    }
    .btn-dark { background: var(--ink); color: var(--paper); }
    .btn-dark:hover { background: #1a1a1a; transform: translateY(-2px); }
    .btn-amber { background: var(--amber); color: var(--ink); box-shadow: 0 0 20px var(--amber-glow); }
    .btn-amber:hover { background: #ffbe26; transform: translateY(-2px); }
    .btn-ghost { background: transparent; color: var(--ink); border: 2px solid rgba(10,10,10,0.3); text-decoration: none; }
    .btn-ghost:hover { background: rgba(10,10,10,0.08); transform: translateY(-2px); }
    .btn-outline-light { background: rgba(240,237,230,0.04); color: var(--paper); border: 1px solid var(--border); }
    .btn-outline-light:hover { border-color: var(--amber); color: var(--amber); transform: translateY(-2px); }

    /* ─── CONTAINER & COMMON ─── */
    .container { max-width: calc(1200px + 6rem); margin: 0 auto; padding: 0 3rem; }
    .section-divider { border-top: 1px solid var(--border); }
    .content-lines { position: relative; z-index: 0; }
    .display { font-family: var(--font-display); font-size: clamp(3rem,5vw,4.5rem); line-height: 0.92; letter-spacing: -0.04em; font-weight: 900; }
    .section-title { font-family: var(--font-display); font-size: clamp(2.5rem,4vw,3.5rem); line-height: 0.92; font-weight: 900; letter-spacing: -0.03em; }
    .mono-label { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber); }

    /* ═══════════════════════════════════════════════
       1. HERO — FULL AMBER VIEWPORT
    ═══════════════════════════════════════════════ */
    .hero {
      min-height: 85vh; background: var(--hero-bg);
      display: flex; flex-direction: column;
      position: relative; overflow: hidden; width: 100%; z-index: 10;
    }
    .site-header { display: flex; position: relative; z-index: 20; }
    .site-nav {
      max-width: calc(1200px + 6rem); margin: 0 auto; padding: 1.5rem 3rem;
      display: flex; justify-content: space-between; align-items: center; width: 100%;
    }
    .site-logo { display: flex; align-items: center; text-decoration: none; color: var(--ink); }
    .site-logo .brand-full-logo { height: 30px; width: auto; display: block; }
    .site-nav-links { display: flex; align-items: center; gap: 2rem; list-style: none; }
    .site-nav-links a {
      font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700;
      color: var(--ink); text-decoration: none; opacity: 0.8; letter-spacing: 0.05em;
      transition: opacity 0.2s;
    }
    .site-nav-links a:hover { opacity: 1; }
    .site-nav-links .site-nav-cta { color: var(--paper) !important; background: var(--ink) !important; opacity: 1; padding: 0.6rem 1.2rem; }
    .nav-toggle { display: none; background: none; border: none; cursor: pointer; flex-direction: column; gap: 5px; padding: 0.5rem; }
    .nav-toggle-bar { display: block; width: 24px; height: 2px; background: var(--ink); transition: transform 0.3s, opacity 0.3s; }

    /* Hero watermark */
    .hero-watermark {
      position: absolute; right: -5%; top: 50%; transform: translateY(-50%);
      width: 55%; color: var(--ink); opacity: 0.08; pointer-events: none;
    }
    .hero:not(.is-visible) .hero-ticker-inner { animation-play-state: paused; }

    .hero-content {
      flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
      padding: 3rem 3rem 2.5rem; max-width: calc(1200px + 6rem); margin: 0 auto; width: 100%; position: relative; z-index: 10;
    }
    .hero h1 {
      font-family: var(--font-display); font-size: clamp(3.5rem,8vw,7rem); line-height: 0.88;
      color: var(--ink); letter-spacing: -0.04em; font-weight: 900; margin-bottom: 2rem;
    }
    .hero-sub { font-size: 1.15rem; font-weight: 600; color: var(--ink); opacity: 0.85; max-width: 540px; line-height: 1.6; margin-bottom: 2.5rem; }
    .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin-bottom: 3rem; }
    .hero-install {
      background: var(--ink); color: var(--paper); display: flex; align-items: center; gap: 12px;
      font-family: var(--font-mono); font-size: 0.88rem; padding: 0.75rem 1.4rem;
      clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
    }
    .hero-install .prefix { color: var(--amber); font-weight: 700; }
    .copy-btn {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.15);
      color: var(--paper); padding: 4px 10px; font-family: var(--font-mono); font-size: 0.72rem;
      border-radius: 2px; cursor: pointer; transition: all 0.15s;
    }
    .copy-btn:hover { background: var(--amber); color: var(--ink); border-color: var(--amber); }

    /* Hero ticker */
    .hero-ticker { border-top: 1px solid rgba(10,10,10,0.15); padding: 0.85rem 0; overflow: hidden; position: relative; z-index: 10; }
    .hero-ticker-inner {
      display: flex; gap: 3.5rem; animation: ticker 20s linear infinite;
      white-space: nowrap; font-family: var(--font-mono); font-size: 0.8rem; font-weight: 700;
      color: var(--ink); opacity: 0.75; letter-spacing: 0.12em; text-transform: uppercase;
    }
    @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

    /* ═══════════════════════════════════════════════
       2. PROBLEM SECTION (SURVEILLANCE EYE + CARDS)
    ═══════════════════════════════════════════════ */
    .content { position: relative; z-index: 1; }
    .problem-section { padding: 0; border-bottom: none; }
    .problem-container { padding: 0; }
    .problem-outer { border-bottom: 1px solid var(--border); position: relative; overflow: hidden; }
    .problem-top { padding: 3rem 3rem 2.5rem; }
    .problem-badge { margin-bottom: 2rem; }
    .problem-headline { font-size: clamp(3rem,5vw,4.5rem); line-height: 0.92; }
    .problem-divider { border-top: 1px solid var(--border); }
    .problem-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: 1fr 1fr; min-height: 420px;
    }
    .problem-eye-col {
      grid-row: 1 / 3; border-right: 1px solid var(--border);
      position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .problem-eye-wrapper { width: 380px; height: 380px; }
    .problem-eye-svg { width: 100%; height: 100%; }
    #eye-pupil { animation: pupil-glitch 4s infinite linear; }
    .problem-card { padding: 2rem; }
    .problem-grid > *:nth-child(2), .problem-grid > *:nth-child(4) { border-right: 1px solid var(--border); }
    .problem-grid > *:nth-child(2), .problem-grid > *:nth-child(3) { border-bottom: 1px solid var(--border); }
    .problem-card-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.75rem; }
    .problem-card-label { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber); }
    .problem-card-number { font-size: 0.6rem; letter-spacing: 0.2em; color: var(--paper-20); font-family: var(--font-mono); }
    .problem-card h3 { font-size: 1.35rem; line-height: 1.05; margin-bottom: 0.75rem; font-weight: 800; }
    .problem-card p { color: var(--paper-dim); font-size: 0.85rem; line-height: 1.6; }
    .eye-blink-target { transform-origin: 240px 240px; transform: scaleY(1); transition: transform 0.25s cubic-bezier(0.7,0,1,0.5); }
    .eye-blink-target.shut { transform: scaleY(0.02); transition: transform 0.2s cubic-bezier(0,0.5,0.3,1); }
    .eye-linework { transition: opacity 0.1s ease; }
    .problem-eye-col:hover .eye-linework { opacity: 0.28; transition: opacity 0s; }

    @keyframes pupil-glitch {
      0%,100%{opacity:1;transform:translate(0)}
      2%{opacity:.8;transform:translate(2px,-1px)} 3%{opacity:.5;transform:translate(-2px,1px)} 4%{opacity:1;transform:translate(0)}
      40%{opacity:1;transform:translate(0)} 40.3%{opacity:.6;transform:translate(-3px)} 40.8%{opacity:.3;transform:translate(2px,-1px)} 41.5%{opacity:1;transform:translate(0)}
      75%{opacity:1;transform:translate(0)} 75.2%{opacity:.7;transform:translate(1px,2px)} 75.6%{opacity:.4;transform:translate(-2px,-1px)} 76%{opacity:1;transform:translate(0)}
    }

    /* ═══════════════════════════════════════════════
       3. INTRO LOCAL / FLOW DIAGRAM SECTION
    ═══════════════════════════════════════════════ */
    .intro-container { position: relative; z-index: 1; }
    .intro-flex { display: flex; flex-direction: column; align-items: center; }
    .intro-headline-wrap { text-align: center; max-width: 650px; margin-bottom: 3rem; }
    .intro-badge { justify-content: center; margin-bottom: 2rem; }
    .intro-title { font-size: clamp(3rem,5vw,4.5rem); line-height: 0.92; margin-bottom: 1.5rem; }
    .intro-desc { color: var(--paper-dim); font-size: 1rem; line-height: 1.6; }
    .intro-spacer { height: 2rem; }
    .intro-diagram-wrap { width: 100%; max-width: 1000px; position: relative; }
    .intro-diagram { width: 100%; display: block; }

    /* ═══════════════════════════════════════════════
       4. OFFLINE / GLOBE SECTION
    ═══════════════════════════════════════════════ */
    .offline-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
    .offline-visual { position: relative; display: flex; align-items: center; justify-content: center; min-height: 420px; margin-left: -3rem; }
    .globe-svg { width: 900px; height: 900px; position: absolute; top: 50%; left: 0; transform: translate(-40%,-50%); }
    .offline-badge { margin: 0 0 1.5rem; }
    .offline-content h2 { font-family: var(--font-display); font-size: clamp(2.5rem,5vw,3.5rem); line-height: 0.9; letter-spacing: -0.03em; margin-bottom: 1.5rem; font-weight: 900; }
    .offline-content > p { color: var(--paper-dim); font-size: 1rem; line-height: 1.7; max-width: 440px; margin-bottom: 2.5rem; }
    .offline-card { transition: border-color 0.1s ease; }
    .offline-card:hover { border-color: rgba(240,237,230,0.47) !important; }
    .offline-card:hover .offline-card-accent { opacity: 1 !important; color: #4ade80 !important; }
    @keyframes disconnect-drift-left { 0%,80%,100%{transform:translate(0);opacity:.5} 85%{transform:translate(-6px,2px);opacity:.3} 90%{transform:translate(-10px,4px);opacity:.15} 95%{transform:translate(-4px,1px);opacity:.4} }
    @keyframes disconnect-drift-right { 0%,80%,100%{transform:translate(0);opacity:.5} 85%{transform:translate(6px,-2px);opacity:.3} 90%{transform:translate(10px,-4px);opacity:.15} 95%{transform:translate(4px,-1px);opacity:.4} }
    .globe-line-left { animation: disconnect-drift-left 6s ease-in-out infinite; }
    .globe-line-right { animation: disconnect-drift-right 6s ease-in-out infinite; }
    @keyframes signal-flicker { 0%,92%,100%{opacity:1;transform:translate(0)} 93%{opacity:.4;transform:translate(-2px,1px)} 95%{opacity:.8;transform:translate(1px,-1px)} 97%{opacity:.3;transform:translate(-1px)} }

    /* ═══════════════════════════════════════════════
       5. THREE-COLUMN DETAILS
    ═══════════════════════════════════════════════ */
    .three-col-grid { display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; align-items: center; }
    .three-col-grid > div:not(.three-col-divider):first-child { padding-left: 2rem; }
    .three-col-grid > div:not(.three-col-divider):last-child { padding-right: 2rem; }
    .three-col-cell { display: flex; flex-direction: column; padding: 0 2rem; justify-content: center; align-items: center; }
    .three-col-inner { padding: 2rem 0; text-align: center; }
    .three-col-badge { justify-content: center; margin-bottom: 1rem; }
    .three-col-heading { font-family: var(--font-display); font-size: clamp(1.5rem,2.5vw,2rem); line-height: 0.95; letter-spacing: -0.03em; margin-bottom: 0.75rem; font-weight: 800; }
    .three-col-text { color: var(--paper-dim); font-size: 0.85rem; line-height: 1.6; }
    .three-col-divider { background: var(--border); width: 1px; align-self: stretch; }

    /* ═══════════════════════════════════════════════
       6. HOW IT WORKS (STEPPER & SHADER CARD)
    ═══════════════════════════════════════════════ */
    .how-section { padding: 8rem 0 0; }
    .how-section > .container { padding-left: 0; padding-right: 0; }
    .how-intro { text-align: center; margin-bottom: 1rem; padding: 0 3rem; }
    .how-intro-badge { justify-content: center; margin-bottom: 1.5rem; }
    .how-intro-body { color: var(--paper-dim); font-size: 1rem; line-height: 1.6; max-width: 620px; margin: 1.5rem auto 0; }
    .how-stepper { display: grid; grid-template-columns: 2fr 3fr; gap: 0; margin-top: 3rem; align-items: start; }
    .how-steps-left { display: flex; flex-direction: column; gap: 0; }
    .how-step {
      padding: 1.5rem 2rem 1.5rem 1.25rem; border: none; border-top: 1px solid var(--border);
      cursor: pointer; position: relative; background: none; color: inherit; font: inherit;
      text-align: left; width: 100%; display: block; outline: none; -webkit-appearance: none;
    }
    .how-step:last-child { border-bottom: 1px solid var(--border); }
    .how-step:focus-visible { outline: 2px solid var(--amber); outline-offset: -2px; }
    .how-step-progress { position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--paper-faint); }
    .how-step-progress-fill { position: absolute; top: 0; left: 0; width: 100%; height: 0%; background: var(--amber); transition: none; }
    .how-step.active .how-step-progress-fill { animation: howProgressFill 6s linear forwards; animation-play-state: paused; }
    @keyframes howProgressFill { 0%{height:0%} 100%{height:100%} }
    .how-step-header { display: flex; flex-direction: column; gap: 0.5rem; }
    .how-step-num { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-faint); transition: color 0.3s; }
    .how-step.active .how-step-num { color: var(--amber); }
    .how-step h3 { font-family: var(--font-display); font-size: clamp(1.5rem,2.5vw,2rem); letter-spacing: -0.02em; line-height: 1.05; color: rgba(240,237,230,0.35); transition: color 0.3s; font-weight: 800; }
    .how-step.active h3 { color: var(--paper); }
    .how-step-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.4s ease, opacity 0.3s ease; opacity: 0; }
    .how-step.active .how-step-body { grid-template-rows: 1fr; opacity: 1; }
    .how-step-body-inner { overflow: hidden; }
    .how-step-body p { color: var(--paper-dim); font-size: 0.9rem; line-height: 1.7; margin-top: 1rem; }
    .how-step-body p + p { margin-top: 0.5rem; }
    .how-illustration {
      position: relative; min-height: 680px; border: 1px solid var(--border); border-right: none;
      background: rgba(240,237,230,0.02); overflow: hidden; display: flex; align-items: center; justify-content: center;
    }
    .shader-overlay-card {
      position: relative; z-index: 1; background: rgba(10,10,10,0.88); border: 1px solid var(--amber);
      border-radius: 6px; padding: 1.75rem 2rem; max-width: 380px; width: 90%;
      font-family: var(--font-mono); font-size: 0.7rem; line-height: 1.8; color: var(--paper-45); backdrop-filter: blur(8px);
    }
    .shader-overlay-card .card-title {
      display: block; color: var(--paper); font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase;
      margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,176,0,0.15);
    }
    .shader-overlay-card .hl-amber { color: var(--amber); }
    .shader-overlay-card .hl-green { color: #22c55e; }
    .shader-overlay-card .hl-bright { color: rgba(240,237,230,0.7); }
    .shader-overlay-card .hl-dim { color: var(--paper-45); }
    .card-content { display: none; }
    .card-content.active { display: block; }

    /* ═══════════════════════════════════════════════
       7. CAPABILITIES GRID
    ═══════════════════════════════════════════════ */
    .illust-features { padding: 8rem 0; }
    .illust-features .container { padding: 0 1.5rem; }
    .illust-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; margin-top: 4rem; }
    .illust-card {
      background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 2.5rem 2rem 2rem;
      transition: all 0.3s;
      clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
    }
    .illust-card:hover { border-color: rgba(255,176,0,0.3); background: rgba(255,176,0,0.05); }
    .illust-card .illust-label { font-size: 0.7rem; color: var(--amber); margin-bottom: 0.75rem; font-weight: 700; font-family: var(--font-mono); letter-spacing: 0.1em; }
    .illust-card h3 { font-family: var(--font-display); font-size: 1.35rem; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 0.75rem; font-weight: 800; }
    .illust-card p { color: var(--paper-dim); font-size: 0.85rem; line-height: 1.6; }

    /* ═══════════════════════════════════════════════
       8. STATS STRIP
    ═══════════════════════════════════════════════ */
    .stats-strip { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); max-width: 1200px; margin: 0 auto; }
    .stat-box { padding: 2rem; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.75rem; }
    .stat-box:last-child { border-right: none; }
    .stat-label { color: var(--amber); font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; }
    .stat-value { font-family: var(--font-display); font-size: 2.5rem; line-height: 1; font-weight: 900; }
    .stat-note { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }

    /* ═══════════════════════════════════════════════
       9. TERMINAL SECTION (MONITOR BEZEL & BLUEPRINTS)
    ═══════════════════════════════════════════════ */
    .terminal-section { padding: 8rem 0; position: relative; }
    .term-header { text-align: center; margin-bottom: 3rem; }
    .term-badge { justify-content: center; margin-bottom: 1.5rem; }
    .term-title { font-size: clamp(2.5rem,4vw,3.5rem); line-height: 0.92; }
    .terminal-artifact { position: relative; max-width: 630px; margin: 0 auto; }
    .terminal-blueprint-left, .terminal-blueprint-right { position: absolute; top: 0; bottom: 0; width: 200px; pointer-events: none; }
    .terminal-blueprint-left { left: -220px; }
    .terminal-blueprint-right { right: -220px; }
    .bp-anno { position: absolute; display: flex; align-items: center; gap: 0; }
    .terminal-blueprint-left .bp-anno { right: 0; }
    .terminal-blueprint-right .bp-anno { left: 0; }
    .bp-at-34 { top: 34%; }
    .bp-at-50 { top: 50%; }
    .bp-at-66 { top: 66%; }
    .bp-text { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1.5; }
    .terminal-blueprint-left .bp-text { text-align: right; }
    .bp-title { color: #fff; }
    .bp-desc { color: var(--paper-45); }
    .bp-line-left, .bp-line-right { width: 40px; height: 1px; background: var(--paper-20); }
    .bp-line-left { margin-left: 12px; }
    .bp-line-right { margin-right: 12px; }
    .bp-dot { width: 4px; height: 4px; border: 1px solid var(--text-faint); background: none; }
    .monitor-casing {
      background: linear-gradient(160deg,#1a1a1a,#111,#0d0d0d); padding: 1.25rem;
      border-radius: 10px; box-shadow: 0 2px 0 var(--paper-06),0 -1px #00000080,0 20px 60px rgba(0,0,0,0.4);
      border: 1px solid var(--paper-06);
    }
    .monitor-vents { display: flex; gap: 4px; margin-bottom: 0.75rem; }
    .monitor-vent { height: 3px; flex-grow: 1; background: var(--paper-06); border-radius: 1px; }
    .monitor-screen-bezel { border: 2px solid var(--paper-06); border-radius: 6px; overflow: hidden; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5); aspect-ratio: 16/12; display: flex; flex-direction: column; }
    .monitor-bezel-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 1.25rem; padding: 1rem 0 0.5rem; border-top: 1px solid var(--paper-06); font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-faint); }
    .monitor-bezel-bottom .model-tag { color: var(--amber); opacity: 0.6; }
    .monitor-led { width: 4px; height: 4px; background: var(--amber); border-radius: 50%; box-shadow: 0 0 6px var(--amber-glow); animation: blink 3s ease-in-out infinite; }
    .terminal-window { background: #050505; overflow: hidden; position: relative; flex: 1; display: flex; flex-direction: column; }
    .terminal-bar { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--paper-06); background: rgba(240,237,230,0.02); }
    .terminal-dots { display: flex; gap: 6px; }
    .terminal-dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(240,237,230,0.12); }
    .terminal-title { font-family: var(--font-mono); font-size: 0.75rem; color: rgba(240,237,230,0.3); text-transform: uppercase; letter-spacing: 0.1em; }
    .blink-dot-sm { width: 6px; height: 6px; background: var(--amber); animation: blink 1s step-end infinite; }
    .terminal-body { padding: 1.75rem; font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.8; flex: 1; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes terminalLineIn { 0%{opacity:0} 0.01%{opacity:1} 100%{opacity:1} }
    .term-line { opacity: 0; animation: terminalLineIn 0.01s step-end forwards; }
    .term-line:nth-child(1){animation-delay:.4s}
    .term-line:nth-child(2){animation-delay:1s}
    .term-line:nth-child(3){animation-delay:1.8s}
    .term-line:nth-child(4){animation-delay:2.4s}
    .term-line:nth-child(5){animation-delay:3.2s}
    .term-line:nth-child(6){animation-delay:3.6s}
    .term-line:nth-child(7){animation-delay:4.2s}
    .term-line:nth-child(8){animation-delay:4.8s}
    .term-line-gap-sm { padding-top: 0.5rem; }
    .term-line-gap { padding-top: 0.75rem; }
    .terminal-body .prompt { color: var(--amber); }
    .terminal-body .cmd { color: var(--paper); }
    .terminal-body .output { color: var(--text-muted); }
    .terminal-body .success { color: var(--amber); }
    .terminal-body .info { color: var(--text-faint); font-size: 0.75rem; }
    .terminal-body .cursor-block { display: inline-block; width: 8px; height: 15px; background: var(--amber); animation: blink 1s step-end infinite; vertical-align: middle; }
    .term-ascii { margin: 0; font-family: var(--font-mono); font-size: 0.6rem; line-height: 1.3; color: var(--paper-20); }
    .terminal-annotations-grid { display: none; }
    .terminal-anno-item { text-align: center; padding: 1.25rem 0.75rem; }
    .terminal-anno-title { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: #fff; margin-bottom: 0.25rem; }
    .terminal-anno-desc { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--paper-45); line-height: 1.5; }

    /* ═══════════════════════════════════════════════
       10. PRICING SECTION
    ═══════════════════════════════════════════════ */
    .pricing-section { padding: 8rem 0; }
    .pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1.5rem; margin-top: 4rem; }
    .pricing-card {
      background: var(--paper-faint); border: 1px solid var(--border); padding: 2.5rem 2rem;
      display: flex; flex-direction: column; gap: 0;
      clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
      transition: border-color 0.2s, background 0.2s;
    }
    .pricing-card:hover { border-color: rgba(255,176,0,0.3); background: rgba(255,176,0,0.04); }
    .pricing-card.featured { border-color: var(--amber); background: rgba(255,176,0,0.06); }
    .pricing-label { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--amber); margin-bottom: 1rem; }
    .pricing-card h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
    .pricing-price { font-family: var(--font-mono); font-size: 2.5rem; font-weight: 900; color: var(--paper); margin-bottom: 0.25rem; }
    .pricing-period { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.5rem; }
    .pricing-divider { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
    .pricing-features { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 2rem; flex: 1; }
    .pricing-features li { font-size: 0.85rem; color: var(--paper-dim); display: flex; align-items: flex-start; gap: 0.5rem; line-height: 1.4; }
    .pricing-features li::before { content: "✓"; color: var(--amber); font-weight: 700; flex-shrink: 0; }

    /* ═══════════════════════════════════════════════
       11. EARLY ACCESS / PROMISE / INSTALL SECTION
    ═══════════════════════════════════════════════ */
    .promise-section { padding: 8rem 0; position: relative; overflow: hidden; }
    .ea-container { position: relative; z-index: 1; }
    .ea-content { text-align: center; max-width: 500px; margin: 0 auto; }
    .ea-badge { justify-content: center; margin-bottom: 1.5rem; }
    .ea-title { font-size: clamp(2.5rem,4vw,3.5rem); line-height: 0.92; margin-bottom: 1.5rem; }
    .ea-desc { color: var(--paper-dim); font-size: 1.2rem; line-height: 1.6; margin-bottom: 2rem; }
    .install-form { display: flex; gap: 0.75rem; max-width: 420px; margin: 0 auto; }
    .install-input {
      flex: 1; padding: 0.85rem 1rem; background: var(--paper-faint); border: 1px solid var(--border);
      color: var(--paper); font-family: var(--font-mono); font-size: 0.85rem; outline: none;
      clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
    }
    .install-input::placeholder { color: var(--text-faint); }
    .install-input:focus { border-color: var(--amber); }

    /* ═══════════════════════════════════════════════
       12. FAQ SECTION
    ═══════════════════════════════════════════════ */
    .faq-section { padding: 8rem 0 0; }
    .faq-title { margin-bottom: 4rem; text-align: center; }
    .faq-list { width: 100%; }
    .faq-item { padding: 0 1.5rem; border-top: 1px solid var(--border); }
    .faq-item:last-child { border-bottom: 1px solid var(--border); }
    .faq-question {
      display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem 0; cursor: pointer;
      list-style: none; user-select: none;
    }
    .faq-question::-webkit-details-marker, .faq-question::marker { display: none; }
    .faq-question-number { color: var(--amber); font-size: 0.7rem; font-weight: 700; flex-shrink: 0; font-family: var(--font-mono); }
    .faq-question-text { font-family: var(--font-display); font-size: 1.2rem; letter-spacing: -0.02em; line-height: 1.2; flex: 1; font-weight: 700; }
    .faq-chevron { flex-shrink: 0; color: var(--paper-45); transition: transform 0.3s, color 0.3s; }
    .faq-item[open] .faq-chevron { transform: rotate(180deg); color: var(--amber); }
    .faq-answer-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s; }
    .faq-item[open] .faq-answer-wrap { grid-template-rows: 1fr; }
    .faq-answer { overflow: hidden; }
    .faq-answer p { padding: 0 0 1.5rem 2.25rem; color: var(--paper-dim); font-size: 0.9rem; line-height: 1.7; max-width: 600px; }
    .faq-question:hover .faq-question-text { color: var(--paper); }
    .faq-question:hover .faq-chevron { color: var(--paper-45); }

    /* ═══════════════════════════════════════════════
       13. CTA SECTION (BLOOM + LOGO)
    ═══════════════════════════════════════════════ */
    .cta-section {
      padding: 12rem 0 16rem; text-align: center; position: relative; z-index: 10;
      border-top: 1px solid var(--border); overflow: hidden;
    }
    .cta-oversized-svg { position: absolute; bottom: -120px; right: -100px; width: 900px; height: 900px; pointer-events: none; opacity: 0.04; }
    .cta-container { position: relative; z-index: 2; }
    .cta-logo-wrap { position: relative; display: block; width: 65px; height: auto; margin: 0 auto 3rem; }
    .cta-logo-glow { position: absolute; top: 0; left: 0; width: 100%; height: auto; animation: hdr-glow-pulse 3s ease-in-out infinite; }
    .cta-logo { position: relative; width: 100%; height: auto; }
    @keyframes hdr-glow-pulse { 0%,100%{filter:blur(8px) brightness(1)} 50%{filter:blur(12px) brightness(1.4)} }
    .cta-heading-wrap { position: relative; display: inline-block; margin-bottom: 3rem; }
    .cta-section h2 { font-family: var(--font-display); font-size: clamp(4rem,8vw,7rem); line-height: 0.9; letter-spacing: -0.03em; max-width: 700px; margin-left: auto; margin-right: auto; font-weight: 900; }
    .cta-section p { font-family: var(--font-mono); font-size: 0.85rem; color: var(--paper-45); margin-bottom: 3rem; }
    .cta-btn-wrap { display: flex; justify-content: center; }
    .cta-btn { padding: 2rem 3rem; font-size: 1.3rem; box-shadow: 0 0 40px var(--amber-glow); width: 100%; max-width: 500px; }
    .cta-fine-print { margin-top: 0.75rem; font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); }

    /* ═══════════════════════════════════════════════
       14. FOOTER
    ═══════════════════════════════════════════════ */
    footer { border-top: 1px solid var(--border); padding: 4rem 0 8rem; position: relative; z-index: 10; background: #070709; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 2rem; position: relative; z-index: 2; }
    .footer-logo { height: 26px; width: auto; }
    .footer-brand p { color: var(--text-muted); font-size: 0.85rem; max-width: 280px; line-height: 1.6; margin-top: 1rem; }
    .footer-col h3 { color: var(--text-muted); margin-bottom: 1.25rem; font-family: var(--font-mono); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; }
    .footer-col ul { list-style: none; }
    .footer-col li { margin-bottom: 0.6rem; }
    .footer-col a { color: var(--paper-45); text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
    .footer-col a:hover { color: var(--amber); }
    .footer-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 4rem; padding-top: 2rem; border-top: 1px solid var(--border); position: relative; z-index: 2; }
    .footer-bottom span { color: var(--text-faint); letter-spacing: 0.1em; font-family: var(--font-mono); font-size: 0.75rem; }
    .footer-status { color: var(--paper-45); gap: 0.6rem; display: flex; align-items: center; }
    .footer-status-dot { width: 6px; height: 6px; background: var(--amber); border-radius: 0; animation: blink 1.5s step-end infinite; flex-shrink: 0; }

    /* ═══════════════════════════════════════════════
       RESPONSIVE
    ═══════════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .terminal-blueprint-left, .terminal-blueprint-right { display: none !important; }
      .terminal-annotations-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-top: 2rem; border: 1px solid var(--border); }
      .terminal-anno-item { border-bottom: 1px solid var(--border); }
      .terminal-anno-item:nth-child(odd) { border-right: 1px solid var(--border); }
      .terminal-anno-item:nth-last-child(-n+2) { border-bottom: none; }
      .how-stepper { grid-template-columns: 1fr 1fr; }
      .how-illustration { min-height: 500px; }
      .stats-strip { grid-template-columns: repeat(2,1fr); }
      .stat-box:nth-child(2) { border-right: none; }
      .stat-box:nth-child(1), .stat-box:nth-child(2) { border-bottom: 1px solid var(--border); }
      .illust-grid { grid-template-columns: repeat(2,1fr); }
      .pricing-grid { grid-template-columns: 1fr 1fr; }
      .problem-grid { grid-template-columns: 1fr 1fr; grid-template-rows: auto; min-height: auto; }
      .problem-eye-col { grid-row: auto; border-right: none; border-bottom: 1px solid var(--border); min-height: 280px; }
    }
    @media (max-width: 768px) {
      .site-nav { padding: 1rem 1.25rem; }
      .site-nav-links { display: none; }
      .nav-toggle { display: flex; }
      .hero-content { padding: 2rem 1.25rem; }
      .hero h1 { font-size: clamp(2.8rem,11vw,4.5rem); }
      .hero-watermark { width: 85%; right: -15%; }
      .how-section { padding: 4rem 0 0; }
      .how-stepper { grid-template-columns: 1fr; }
      .how-illustration { min-height: 400px; order: 2; border-right: 1px solid var(--border); border-bottom: none; }
      .how-steps-left { order: 1; }
      .how-step { padding: 1.25rem; border-right: 1px solid var(--border); }
      .illust-features { padding: 4rem 0; }
      .illust-grid { grid-template-columns: 1fr; gap: 1rem; margin-top: 2rem; }
      .illust-card { padding: 1.5rem 1.25rem; }
      .stats-strip { grid-template-columns: 1fr; }
      .stat-box { border-right: none; border-bottom: 1px solid var(--border); padding: 1.5rem 1.25rem; }
      .stat-box:last-child { border-bottom: none; }
      .stat-value { font-size: 2rem; }
      .terminal-section { padding: 4rem 0; }
      .terminal-body { padding: 1rem; font-size: 0.75rem; }
      .monitor-screen-bezel { aspect-ratio: auto; }
      .terminal-annotations-grid { margin-top: 1.5rem; }
      .pricing-grid { grid-template-columns: 1fr; }
      .problem-grid { grid-template-columns: 1fr; grid-template-rows: auto; min-height: auto; }
      .problem-card { border-right: none !important; border-bottom: 1px solid var(--border); }
      .offline-layout { grid-template-columns: 1fr; gap: 2rem; }
      .offline-visual { margin-left: 0; min-height: 300px; }
      .three-col-grid { grid-template-columns: 1fr; }
      .three-col-divider { width: 100%; height: 1px; align-self: auto; }
      .footer-grid { grid-template-columns: 1fr; }
      .footer-bottom { flex-direction: column; gap: 1rem; align-items: flex-start; }
      .cta-section { padding: 6rem 0 8rem; }
      .cta-btn { padding: 1.25rem 2rem !important; font-size: 1rem !important; }
      .faq-section { padding: 4rem 0; }
      .faq-title { margin-bottom: 2rem; }
    }

    /* ─── WAITLIST & EARLY ACCESS ─── */
    .waitlist-card {
      background: var(--bg);
      border: 1px solid var(--border-accent);
      padding: 3rem 2.5rem;
      clip-path: polygon(var(--chamfer) 0, 100% 0, 100% calc(100% - var(--chamfer)), calc(100% - var(--chamfer)) 100%, 0 100%, 0 var(--chamfer));
      box-shadow: 0 0 50px rgba(255, 176, 0, 0.08);
      text-align: center;
      max-width: 680px;
      margin: 0 auto;
      position: relative;
    }
    .waitlist-form {
      margin: 2rem auto 1.5rem;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .waitlist-input-group {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .waitlist-input {
      flex: 1;
      background: rgba(240, 237, 230, 0.05);
      border: 1px solid var(--border);
      color: var(--paper);
      font-family: var(--font-mono);
      font-size: 0.9rem;
      padding: 0.9rem 1.2rem;
      clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
      outline: none;
      transition: border-color 0.2s, background 0.2s;
    }
    .waitlist-input:focus {
      border-color: var(--amber);
      background: rgba(255, 176, 0, 0.04);
    }
    .waitlist-submit-btn {
      white-space: nowrap;
      padding: 0.9rem 1.6rem !important;
      font-size: 0.85rem !important;
      flex-shrink: 0;
    }
    .waitlist-status {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      padding: 12px 16px;
      border-radius: 4px;
      text-align: left;
      line-height: 1.5;
      margin-top: 8px;
    }
    .waitlist-status.success {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #22c55e;
    }
    .waitlist-status.error {
      background: rgba(237, 70, 45, 0.1);
      border: 1px solid rgba(237, 70, 45, 0.3);
      color: #ed462d;
    }
    .pos-badge {
      display: inline-block;
      background: var(--amber);
      color: #0a0a0a;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 3px;
      margin-right: 8px;
    }
    .waitlist-perks {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    .waitlist-perk {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--paper-dim);
    }
    .waitlist-perk svg { color: var(--amber); flex-shrink: 0; }
    @media (max-width: 600px) {
      .waitlist-input-group { flex-direction: column; }
      .waitlist-submit-btn { width: 100%; justify-content: center; }
    }

  </style>
</head>
<body>

  <!-- Overlays -->
  <div class="scanlines" aria-hidden="true"></div>
  <div class="noise" aria-hidden="true"></div>

  <!-- ═══ 1. HERO — FULL AMBER VIEWPORT ═══ -->
  <section class="hero is-visible">
    <header class="site-header" role="banner">
      <nav class="site-nav" aria-label="Main navigation">
        <a href="/" class="site-logo" aria-label="Freeport — Home">
          <!-- Official Freeport Logomark — Asset 10 -->
          <svg class="brand-full-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 553.49 196.89">
            <g>
              <g>
                <polygon points="84.31 196.89 0 148.1 0 52.12 84.31 100.12 84.31 196.89" fill="#0a0a0a"/>
                <path d="M87.76,196.89v-96.67l85-47.3v94.6l-85,49.37ZM103.76,115.99l15.71,10.9-16.42,26.84,3.65,2.36,19.58-31.38c-.18-2.29-17.06-11.6-19.61-14.08-1.43-.22-3.49,4.33-2.9,5.35ZM153.41,126.46c-.39-.43-3.84,1.54-4.61,1.95-3.2,1.71-14.5,7.81-16.5,9.75-1.57,1.52-.93,3.57-.99,5.56,1.36,1.45,18.52-10.6,21.43-11.38l.68-5.88Z" fill="#0a0a0a"/>
                <path d="M172.76,49.01l-86.66,47.67L0,49.01,86.09,0l86.67,49.01ZM42.15,49.01c18.74,11.98,29.98,19.65,44,28.84,15.13-7.47,29.53-19.77,43.76-28.84,0,0-88.33-.37-87.76,0Z" fill="#0a0a0a"/>
              </g>
              <g>
                <path d="M214.81,49.8h39.41l-4.87,20.78h-17.34l-5.73,25.23h14.48l-2.58,11.47h-14.62l-10.03,43.57h-22.07l23.36-101.04Z" fill="#0a0a0a"/>
                <path d="M252.22,67.42h16.91l1,10.03h1.43c2.29-9.6,7.31-11.47,15.19-11.47h.29l-5.73,24.51h-11.32c-1.29,0-1.86.43-2.01,1.58l-13.62,58.76h-21.36l19.21-83.42Z" fill="#0a0a0a"/>
                <path d="M274.29,128.91l10.46-45.29c3.3-14.19,13.47-17.63,23.93-17.63,17.06,0,23.51,9.17,20.21,23.36l-5.02,21.64h-24.08l-4.73,20.35c-.29,1.15.14,1.58,1.43,1.58s1.72-.43,2.01-1.58l4.3-18.2,20.07,2.15-4.44,19.35c-3.3,14.19-12.61,17.63-23.08,17.63-17.06,0-24.37-9.17-21.07-23.36ZM304.67,104.55l4.16-17.63c.29-1.15-.14-1.58-1.43-1.58s-1.72.43-2.01,1.58l-4.16,17.63h3.44Z" fill="#0a0a0a"/>
                <path d="M322.59,128.91l10.46-45.29c3.3-14.19,13.47-17.63,23.93-17.63,17.06,0,23.51,9.17,20.21,23.36l-5.02,21.64h-24.08l-4.73,20.35c-.29,1.15.14,1.58,1.43,1.58s1.72-.43,2.01-1.58l4.3-18.2,20.07,2.15-4.44,19.35c-3.3,14.19-12.61,17.63-23.08,17.63-17.06,0-24.37-9.17-21.07-23.36ZM352.98,104.55l4.16-17.63c.29-1.15-.14-1.58-1.43-1.58s-1.72.43-2.01,1.58l-4.16,17.63h3.44Z" fill="#0a0a0a"/>
                <path d="M385.66,67.42h17.49l1.29,10.03h1.29c1.86-8.6,7.17-11.47,12.9-11.47,7.6,0,12.33,5.02,9.75,16.2l-13.04,56.76c-2.58,11.18-9.03,13.33-14.48,13.33-7.88,0-10.89-4.59-9.32-11.47h-1.72c-1,5.02-1.58,7.88-2.72,12.9l-4.16,17.77h-21.36l24.08-104.05ZM395.11,133.5l11.32-48.73c.29-1.15-.14-1.58-1.43-1.58s-1.72.43-2.01,1.58l-11.32,48.73c-.29,1.15.14,1.58,1.43,1.58s1.72-.43,2.01-1.58Z" fill="#0a0a0a"/>
                <path d="M420.34,128.91l10.46-45.29c2.72-11.75,10.75-17.63,23.93-17.63,16.48,0,24.37,8.74,20.93,23.36l-10.46,45.29c-2.72,11.75-10.61,17.63-23.79,17.63-16.63,0-24.51-8.74-21.07-23.36ZM444.56,131.35l10.32-44.43c.29-1.15-.14-1.58-1.43-1.58s-1.72.43-2.01,1.58l-10.32,44.43c-.29,1.15.14,1.58,1.43,1.58s1.72-.43,2.01-1.58Z" fill="#0a0a0a"/>
                <path d="M483.98,67.42h16.91l1,10.03h1.43c2.29-9.6,7.31-11.47,15.19-11.47h.29l-5.73,24.51h-11.32c-1.29,0-1.86.43-2.01,1.58l-13.62,58.76h-21.36l19.21-83.42Z" fill="#0a0a0a"/>
                <path d="M527.4,150.84c-13.04,0-21.5-6.88-17.92-22.22l9.46-41.13h-3.3l4.59-20.07h3.3l4.59-15.19h20.35l-3.58,15.19h8.6l-4.59,20.07h-8.6l-9.32,40.13c-.43,2.15.14,3.15,2.15,3.15h5.73l-4.59,20.07h-6.88Z" fill="#0a0a0a"/>
              </g>
            </g>
          </svg>
        </a>

        <button class="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Toggle navigation" type="button">
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
          <span class="nav-toggle-bar"></span>
        </button>

        <ul class="site-nav-links" id="nav-menu" role="list">
          <li><a href="#intro-freeport">How it works</a></li>
          <li><a href="#capabilities">Capabilities</a></li>
          <li><a href="#terminal-demo">Terminal</a></li>
          <li><a href="#early-access" style="color:var(--ink);font-weight:700;">Waitlist & Sponsors</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li>
            <a id="nav-join-btn" href="#install-cta" class="btn-chamfer site-nav-cta btn-dark">
              Install Free CLI
            </a>
          </li>
        </ul>
      </nav>
    </header>

    <!-- Hero watermark (faded Freeport cube logo) -->
    <svg class="hero-watermark" viewBox="0 0 218.38 248.89" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89" fill="currentColor"/>
      <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41ZM131.16,146.62l19.85,13.78-20.76,33.93,4.62,2.98,24.74-39.66c-.23-2.9-21.57-14.66-24.79-17.8-1.81-.28-4.41,5.47-3.67,6.76ZM193.92,159.86c-.49-.55-4.85,1.94-5.82,2.46-4.05,2.16-18.33,9.87-20.86,12.32-1.98,1.92-1.18,4.52-1.26,7.03,1.72,1.83,23.41-13.4,27.09-14.39l.86-7.43Z" fill="currentColor"/>
      <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95ZM53.28,61.95c23.68,15.15,37.9,24.84,55.62,36.46,19.13-9.44,37.33-24.99,55.32-36.46,0,0-111.66-.46-110.94,0Z" fill="currentColor"/>
    </svg>

    <div class="hero-content">
      <h1 style="margin-top: 2rem;">Autonomous AI coding.<br>No lockouts. No limits.</h1>
      <p class="hero-sub">
        A complete CLI coding agent powered by DeepSeek V4. Generous daily reset quotas, transparent token economics, zero code telemetry, and local checkout rails worldwide.
      </p>
      <div class="hero-actions">
        <div class="hero-install">
          <span class="prefix">$</span>
          <span id="install-cmd-text">npm install -g freeport-ai</span>
          <button class="copy-btn" onclick="copyInstallCmd()">Copy</button>
        </div>
        <a href="#early-access" class="btn-chamfer btn-dark" id="hero-join-btn">Join Early Access &rarr;</a>
        <a href="#intro-freeport" class="btn-chamfer btn-ghost">Our Approach</a>
      </div>
    </div>

    <!-- Ticker -->
    <div class="hero-ticker">
      <div class="hero-ticker-inner">
        <span>Zero telemetry</span> <span>•</span> <span>DeepSeek V4 Flash</span> <span>•</span>
        <span>Daily quota reset</span> <span>•</span> <span>Your hardware, your rules</span> <span>•</span>
        <span>No lockouts, no limits</span> <span>•</span> <span>Paddle checkout worldwide</span> <span>•</span>
        <span>100% private context</span> <span>•</span> <span>BYOK power user mode</span> <span>•</span>
        <span>Zero telemetry</span> <span>•</span> <span>DeepSeek V4 Flash</span> <span>•</span>
        <span>Daily quota reset</span> <span>•</span> <span>Your hardware, your rules</span> <span>•</span>
        <span>No lockouts, no limits</span> <span>•</span> <span>Paddle checkout worldwide</span> <span>•</span>
        <span>100% private context</span> <span>•</span> <span>BYOK power user mode</span>
      </div>
    </div>
  </section>

  <div class="content-lines"></div>
  <main class="content">
    <div style="padding-bottom: 4rem;"><div class="section-divider" style="position:relative;top:4rem;"></div></div>

    <!-- ═══ 2. PROBLEM SECTION ═══ -->
    <section class="signal-section problem-section">
      <div class="container problem-container">
        <div class="problem-outer">
          <div class="problem-top">
            <div class="badge problem-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 11 11 L 13 11 L 13 13 L 11 13 Z M 15 7 L 17 7 L 17 9 L 15 9 Z M 7 7 L 9 7 L 9 9 L 7 9 Z M 7 15 L 9 15 L 9 17 L 7 17 Z M 15 15 L 17 15 L 17 17 L 15 17 Z M 5 17 L 7 17 L 7 19 L 5 19 Z M 5 5 L 7 5 L 7 7 L 5 7 Z M 9 13 L 11 13 L 11 15 L 9 15 Z M 13 13 L 15 13 L 15 15 L 13 15 Z M 13 9 L 15 9 L 15 11 L 13 11 Z M 9 9 L 11 9 L 11 11 L 9 11 Z M 17 5 L 19 5 L 19 7 L 17 7 Z M 17 17 L 19 17 L 19 19 L 17 19 Z" fill="var(--amber)"></path></svg>
              The problem
            </div>
            <h2 class="display problem-headline">You don't own your AI.<br>And you're being watched.</h2>
          </div>
          <div class="problem-divider"></div>
          <div class="problem-grid">
            <!-- Left: Surveillance eye illustration -->
            <div class="problem-eye-col">
              <div class="problem-eye-wrapper">
                <svg id="surveillance-eye" class="problem-eye-svg" viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g class="eye-linework" opacity="0.22">
                    <circle cx="240" cy="240" r="220" stroke="#F0EDE6" stroke-width="0.5"/>
                    <circle cx="240" cy="240" r="180" stroke="#F0EDE6" stroke-width="0.5"/>
                    <circle cx="240" cy="240" r="140" stroke="#F0EDE6" stroke-width="0.5"/>
                    <circle cx="240" cy="240" r="100" stroke="#F0EDE6" stroke-width="0.5"/>
                    <circle cx="240" cy="240" r="60" stroke="#F0EDE6" stroke-width="0.5"/>
                    <line x1="240" y1="0" x2="240" y2="480" stroke="#F0EDE6" stroke-width="0.3"/>
                    <line x1="0" y1="240" x2="480" y2="240" stroke="#F0EDE6" stroke-width="0.3"/>
                    <line x1="70" y1="70" x2="410" y2="410" stroke="#F0EDE6" stroke-width="0.3"/>
                    <line x1="410" y1="70" x2="70" y2="410" stroke="#F0EDE6" stroke-width="0.3"/>
                    <g class="eye-blink-target">
                      <path d="M120 240 C120 240 180 170 240 170 C300 170 360 240 360 240 C360 240 300 310 240 310 C180 310 120 240 120 240Z" stroke="#F0EDE6" stroke-width="1" fill="none"/>
                      <circle cx="240" cy="240" r="35" stroke="#F0EDE6" stroke-width="1" fill="none"/>
                    </g>
                    <g stroke="#F0EDE6" stroke-width="0.6">
                      <polyline points="40,70 40,40 70,40" fill="none"/>
                      <polyline points="410,40 440,40 440,70" fill="none"/>
                      <polyline points="440,410 440,440 410,440" fill="none"/>
                      <polyline points="70,440 40,440 40,410" fill="none"/>
                    </g>
                    <text x="240" y="478" text-anchor="middle" fill="#F0EDE6" opacity="0.6" font-family="'Chivo Mono', monospace" font-size="5" letter-spacing="0.2em">MONITORING ACTIVE</text>
                  </g>
                  <!-- Pupil -->
                  <circle id="eye-pupil" class="eye-blink-target" cx="240" cy="255" r="14" fill="var(--amber)"/>
                </svg>
              </div>
            </div>

            <!-- Problem Cards -->
            <div class="problem-card">
              <div class="problem-card-header">
                <span class="mono problem-card-label">Data extraction</span>
                <span class="mono problem-card-number">001</span>
              </div>
              <h3 class="display-heavy">They train on your code.</h3>
              <p>Every prompt. Every file. Every fix.<br>It flows through infrastructure you don't control — improving systems they sell back to you.</p>
            </div>

            <div class="problem-card">
              <div class="problem-card-header">
                <span class="mono problem-card-label">Artificial scarcity</span>
                <span class="mono problem-card-number">002</span>
              </div>
              <h3 class="display-heavy">They meter your ambition.</h3>
              <p>Slowdowns, overages, caps.<br>Right when you're deep in a sprint, the meter decides you've had enough.</p>
            </div>

            <div class="problem-card">
              <div class="problem-card-header">
                <span class="mono problem-card-label">Silent downgrades</span>
                <span class="mono problem-card-number">003</span>
              </div>
              <h3 class="display-heavy">They change the model.</h3>
              <p>They silently downgrade to cheaper models during peak load. Full price, degraded experience.</p>
            </div>

            <div class="problem-card">
              <div class="problem-card-header">
                <span class="mono problem-card-label">Cloud dependency</span>
                <span class="mono problem-card-number">004</span>
              </div>
              <h3 class="display-heavy">They lock you out.</h3>
              <p>Every completion makes a round trip across the internet.<br>Thousands of tiny interruptions. Every single day.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 3. INTRODUCING FREEPORT (FLOW DIAGRAM) ═══ -->
    <section class="offline-section" id="intro-freeport" style="padding: 8rem 0;">
      <div class="intro-shader-wrap"></div>
      <div class="container intro-container">
        <div class="intro-flex">
          <div class="intro-headline-wrap">
            <div class="badge intro-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 14 11 L 16 11 L 16 13 L 14 13 Z M 18 7 L 20 7 L 20 9 L 18 9 Z M 4 13 L 6 13 L 6 15 L 4 15 Z M 10 15 L 12 15 L 12 17 L 10 17 Z M 8 17 L 10 17 L 10 19 L 8 19 Z M 12 13 L 14 13 L 14 15 L 12 15 Z M 16 9 L 18 9 L 18 11 L 16 11 Z M 6 15 L 8 15 L 8 17 L 6 17 Z" fill="var(--amber)"></path></svg>
              Introducing Freeport
            </div>
            <h2 class="display intro-title">Transparent AI.<br>Own your workflow.</h2>
            <p class="intro-desc">A complete AI coding agent running with daily reset quotas, zero telemetry, and transparent token economics. Worldwide Paddle checkout. No lockouts.</p>
          </div>
          <div class="intro-spacer"></div>
          <!-- Solution flow diagram -->
          <div class="intro-diagram-wrap">
            <svg class="intro-diagram" viewBox="0 0 560 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="trail-h1" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#ffb000" stop-opacity="0"/>
                  <stop offset="70%" stop-color="#ffb000" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#ffb000" stop-opacity="0.6"/>
                </linearGradient>
                <linearGradient id="trail-h2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#ffb000" stop-opacity="0"/>
                  <stop offset="70%" stop-color="#ffb000" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#ffb000" stop-opacity="0.6"/>
                </linearGradient>
                <path id="path-code-fp" d="M130,125 L193,125"/>
                <path id="path-fp-resp" d="M353,125 L423,125"/>
                <path id="path-cloud-down" d="M273,37 L273,57"/>
                <path id="path-fp-telem" d="M273,172 L273,192"/>
              </defs>
              <!-- Machine boundary -->
              <rect x="5" y="68" width="550" height="112" fill="none" stroke="rgba(240,237,230,0.08)" stroke-width="1" stroke-dasharray="4 4"/>
              <rect x="15" y="61" width="96" height="14" fill="var(--bg)"/>
              <text x="20" y="71" font-family="'Chivo Mono',monospace" font-size="6" letter-spacing="2" fill="rgba(240,237,230,0.3)">YOUR MACHINE</text>
              <!-- Box: Local Codebase -->
              <g>
                <rect x="20" y="100" width="110" height="50" fill="rgba(10,10,10,0.95)" stroke="rgba(240,237,230,0.15)" stroke-width="1"/>
                <text x="75" y="121" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="7" letter-spacing="1.5" fill="rgba(240,237,230,0.4)">YOUR CODE</text>
                <text x="75" y="133" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="5.5" letter-spacing="1" fill="rgba(240,237,230,0.25)">KEYSTROKES · FILES</text>
              </g>
              <!-- Connector 1 -->
              <line x1="130" y1="125" x2="193" y2="125" stroke="rgba(255,176,0,0.15)" stroke-width="1"/>
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--amber)">
                <animateMotion dur="2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#path-code-fp"/></animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2s" repeatCount="indefinite"/>
              </rect>
              <line x1="130" y1="125" x2="193" y2="125" stroke="url(#trail-h1)" stroke-width="2">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite"/>
              </line>
              <!-- Box: Freeport CLI -->
              <g>
                <rect x="193" y="80" width="160" height="90" fill="rgba(10,10,10,0.95)" stroke="var(--amber)" stroke-width="1.5"/>
                <text x="273" y="118" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="12" letter-spacing="2" fill="var(--amber)" font-weight="900">FREEPORT</text>
                <text x="273" y="136" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="7.5" letter-spacing="1.5" fill="#22c55e" font-weight="700">✓ AGENT EXECUTION</text>
                <line x1="210" y1="155" x2="336" y2="155" stroke="rgba(240,237,230,0.08)" stroke-width="0.5"/>
                <text x="273" y="168" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="6" letter-spacing="1" fill="rgba(240,237,230,0.3)">SUBAGENTS · RECONCILER</text>
              </g>
              <!-- Connector 2 -->
              <line x1="353" y1="125" x2="423" y2="125" stroke="rgba(255,176,0,0.15)" stroke-width="1"/>
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--amber)">
                <animateMotion dur="2s" begin="1s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#path-fp-resp"/></animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="2s" begin="1s" repeatCount="indefinite"/>
              </rect>
              <line x1="353" y1="125" x2="423" y2="125" stroke="url(#trail-h2)" stroke-width="2">
                <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" begin="1s" repeatCount="indefinite"/>
              </line>
              <!-- Box: DeepSeek V4 -->
              <g>
                <rect x="423" y="100" width="120" height="50" fill="rgba(10,10,10,0.95)" stroke="rgba(240,237,230,0.15)" stroke-width="1"/>
                <text x="483" y="121" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="7" letter-spacing="1.5" fill="rgba(240,237,230,0.4)">DEEPSEEK V4</text>
                <text x="483" y="133" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="5.5" letter-spacing="1" fill="#38bdf8">&lt;300ms STREAM</text>
              </g>
              <!-- Blocked: Code Telemetry -->
              <g>
                <rect x="213" y="5" width="120" height="32" fill="rgba(10,10,10,0.95)" stroke="rgba(240,237,230,0.1)" stroke-width="1"/>
                <text x="273" y="21" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="7" letter-spacing="1.5" fill="rgba(240,237,230,0.4)">CODE TELEMETRY</text>
              </g>
              <line x1="273" y1="37" x2="273" y2="80" stroke="var(--red)" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.4"/>
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--red)">
                <animateMotion dur="1.5s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#path-cloud-down"/></animateMotion>
                <animate attributeName="opacity" values="0.8;0.8;0" keyTimes="0;0.6;1" dur="1.5s" repeatCount="indefinite"/>
              </rect>
              <g>
                <line x1="267" y1="51" x2="279" y2="63" stroke="var(--red)" stroke-width="1.5"/>
                <line x1="279" y1="51" x2="267" y2="63" stroke="var(--red)" stroke-width="1.5"/>
              </g>
              <!-- Blocked: Model Training -->
              <g>
                <rect x="213" y="215" width="120" height="32" fill="rgba(10,10,10,0.95)" stroke="rgba(240,237,230,0.1)" stroke-width="1"/>
                <text x="273" y="231" text-anchor="middle" font-family="'Chivo Mono',monospace" font-size="7" letter-spacing="1.5" fill="rgba(240,237,230,0.4)">MODEL TRAINING</text>
              </g>
              <line x1="273" y1="172" x2="273" y2="215" stroke="var(--red)" stroke-width="0.5" stroke-dasharray="3 5" opacity="0.4"/>
              <rect x="-1.5" y="-1.5" width="3" height="3" fill="var(--red)">
                <animateMotion dur="1.5s" begin="0.75s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#path-fp-telem"/></animateMotion>
                <animate attributeName="opacity" values="0.8;0.8;0" keyTimes="0;0.6;1" dur="1.5s" begin="0.75s" repeatCount="indefinite"/>
              </rect>
              <g>
                <line x1="267" y1="187" x2="279" y2="199" stroke="var(--red)" stroke-width="1.5"/>
                <line x1="279" y1="187" x2="267" y2="199" stroke="var(--red)" stroke-width="1.5"/>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 4. GLOBE / OFFLINE SECTION ═══ -->
    <section class="offline-section" style="padding: 0;">
      <div class="container" style="position: relative;">
        <div class="offline-layout" style="min-height: 560px;">
          <div class="offline-visual" style="overflow: hidden; min-height: 560px; position: relative;">
            <!-- Simple vertical flow diagram (severed connections) -->
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3;display:flex;flex-direction:column;align-items:center;gap:0;">
              <div class="offline-card" style="font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:rgba(240,237,230,0.4);padding:0.75rem 1.5rem;background:rgba(10,10,10,0.95);border:1px solid rgba(240,237,230,0.1);">Cloud API</div>
              <div style="display:flex;flex-direction:column;align-items:center;padding:0.25rem 0;">
                <svg width="2" height="16" viewBox="0 0 2 16"><line x1="1" y1="0" x2="1" y2="16" stroke="var(--red)" stroke-width="1" stroke-dasharray="2 3"/></svg>
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin:2px 0"><line x1="3" y1="3" x2="13" y2="13" stroke="var(--red)" stroke-width="1"/><line x1="13" y1="3" x2="3" y2="13" stroke="var(--red)" stroke-width="1"/></svg>
                <div style="font-family:var(--font-mono);font-size:0.5rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--red);margin:2px 0;">Severed</div>
                <svg width="2" height="16" viewBox="0 0 2 16"><line x1="1" y1="0" x2="1" y2="16" stroke="var(--red)" stroke-width="1" stroke-dasharray="2 3"/></svg>
              </div>
              <div class="offline-card" style="font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.15em;padding:1.25rem 2rem;background:rgba(10,10,10,0.95);border:1px solid rgba(255,176,0,0.3);text-align:center;">
                <div class="offline-card-title" style="font-size:0.8rem;color:var(--paper);margin-bottom:0.4rem;">Freeport CLI</div>
                <div class="offline-card-accent" style="font-size:0.55rem;color:#22c55e;opacity:0.8;display:flex;align-items:center;justify-content:center;gap:0.3rem;"><span>✓</span> Agent active</div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;padding:0.25rem 0;">
                <svg width="2" height="16" viewBox="0 0 2 16"><line x1="1" y1="0" x2="1" y2="16" stroke="var(--red)" stroke-width="1" stroke-dasharray="2 3"/></svg>
                <svg width="16" height="16" viewBox="0 0 16 16" style="margin:2px 0"><line x1="3" y1="3" x2="13" y2="13" stroke="var(--red)" stroke-width="1"/><line x1="13" y1="3" x2="3" y2="13" stroke="var(--red)" stroke-width="1"/></svg>
                <div style="font-family:var(--font-mono);font-size:0.5rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--red);margin:2px 0;">Severed</div>
                <svg width="2" height="16" viewBox="0 0 2 16"><line x1="1" y1="0" x2="1" y2="16" stroke="var(--red)" stroke-width="1" stroke-dasharray="2 3"/></svg>
              </div>
              <div class="offline-card" style="font-family:var(--font-mono);font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:rgba(240,237,230,0.4);padding:0.75rem 1.5rem;background:rgba(10,10,10,0.95);border:1px solid rgba(240,237,230,0.1);">Code telemetry</div>
            </div>

            <!-- Globe SVG -->
            <svg class="globe-svg" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="160" cy="160" r="140" stroke="rgba(240,237,230,0.08)" stroke-width="0.8" fill="none"/>
              <circle cx="160" cy="160" r="140" stroke="rgba(240,237,230,0.02)" stroke-width="40" fill="none"/>
              <ellipse cx="160" cy="80" rx="110" ry="10" stroke="rgba(240,237,230,0.06)" stroke-width="0.5" fill="none"/>
              <ellipse cx="160" cy="115" rx="130" ry="10" stroke="rgba(240,237,230,0.07)" stroke-width="0.5" fill="none"/>
              <ellipse cx="160" cy="145" rx="138" ry="10" stroke="rgba(240,237,230,0.07)" stroke-width="0.5" fill="none"/>
              <ellipse cx="160" cy="175" rx="138" ry="10" stroke="rgba(240,237,230,0.07)" stroke-width="0.5" fill="none"/>
              <ellipse cx="160" cy="205" rx="130" ry="10" stroke="rgba(240,237,230,0.07)" stroke-width="0.5" fill="none"/>
              <ellipse cx="160" cy="240" rx="110" ry="10" stroke="rgba(240,237,230,0.06)" stroke-width="0.5" fill="none"/>
              <g class="globe-line-left">
                <path d="M160 20 Q100 80 95 160 Q100 240 160 300" stroke="rgba(240,237,230,0.1)" stroke-width="0.8" fill="none" stroke-dasharray="6 5"/>
                <path d="M160 20 Q60 90 50 160 Q60 230 160 300" stroke="rgba(240,237,230,0.06)" stroke-width="0.5" fill="none" stroke-dasharray="4 6"/>
              </g>
              <g class="globe-line-right">
                <path d="M160 20 Q220 80 225 160 Q220 240 160 300" stroke="rgba(240,237,230,0.1)" stroke-width="0.8" fill="none" stroke-dasharray="6 5"/>
                <path d="M160 20 Q260 90 270 160 Q260 230 160 300" stroke="rgba(240,237,230,0.06)" stroke-width="0.5" fill="none" stroke-dasharray="4 6"/>
              </g>
              <line x1="160" y1="20" x2="160" y2="300" stroke="rgba(240,237,230,0.06)" stroke-width="0.8" stroke-dasharray="4 4"/>
              <g style="animation: signal-flicker 4s ease-in-out infinite;">
                <text x="158" y="165" font-family="'Chivo Mono',monospace" font-size="10" fill="var(--amber)" opacity="0.7">FP</text>
              </g>
            </svg>
          </div>

          <div class="offline-content">
            <div class="badge offline-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 5 4 L 19 4 L 19 6 L 5 6 Z M 19 15 L 19 6 L 21 6 L 21 17 L 3 17 L 3 6 L 5 6 L 5 15 Z M 3 18 L 21 18 L 21 20 L 3 20 Z" fill="var(--amber)"></path></svg>
              Zero telemetry
            </div>
            <h2>Your code never leaves.</h2>
            <p>Spotty Wi-Fi. Network outages. Shared environments. Nothing exposes your proprietary code. Freeport executes on your machine, keeping context 100% local.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 5. THREE-COLUMN DETAILS ═══ -->
    <section class="offline-section three-col" style="padding: 0;">
      <div class="container" style="padding-left:0;padding-right:0;">
        <div class="three-col-grid">
          <div class="three-col-cell">
            <div class="three-col-inner">
              <div class="badge three-col-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 22 11 L 22 13 L 20 13 L 20 15 L 18 15 L 18 9 L 20 9 L 20 11 Z M 6 10 L 8 10 L 8 14 L 6 14 Z M 9 10 L 11 10 L 11 14 L 9 14 Z M 12 10 L 14 10 L 14 14 L 12 14 Z M 15 10 L 17 10 L 17 14 L 15 14 Z M 18 7 L 18 9 L 5 9 L 5 15 L 18 15 L 18 17 L 3 17 L 3 7 Z" fill="var(--amber)"></path></svg>
                Daily Resets
              </div>
              <h3 class="three-col-heading">Remove the meter.</h3>
              <p class="three-col-text">Refactor entire codebases. Riff on ideas all day. Run agent loops with 3 generous sessions per day that reset at UTC midnight — no weekly bans.</p>
            </div>
          </div>

          <div class="three-col-divider"></div>

          <div class="three-col-cell">
            <div class="three-col-inner">
              <div class="badge three-col-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 10 4 L 14 4 L 14 6 L 10 6 Z M 11 13 L 13 13 L 13 17 L 11 17 Z M 6 10 L 8 10 L 8 6 L 10 6 L 10 10 L 14 10 L 14 6 L 16 6 L 16 10 L 18 10 L 18 12 L 6 12 Z M 6 18 L 18 18 L 18 20 L 6 20 Z M 18 12 L 20 12 L 20 18 L 18 18 Z M 4 12 L 6 12 L 6 18 L 4 18 Z" fill="var(--amber)"></path></svg>
                Privacy
              </div>
              <h3 class="three-col-heading">Sever the connection.</h3>
              <p class="three-col-text">Your code, keystrokes, and files never leave your machine. Not anonymized. Not aggregated. Not sent. Zero prompt surveillance.</p>
            </div>
          </div>

          <div class="three-col-divider"></div>

          <div class="three-col-cell">
            <div class="three-col-inner">
              <div class="badge three-col-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 8 4 L 11 4 L 11 3 L 9 3 L 9 1 L 15 1 L 15 3 L 13 3 L 13 4 L 16 4 L 16 6 L 8 6 Z M 8 18 L 16 18 L 16 20 L 8 20 Z M 16 6 L 18 6 L 18 8 L 16 8 Z M 18 8 L 20 8 L 20 16 L 18 16 Z M 4 8 L 6 8 L 6 16 L 4 16 Z M 6 6 L 8 6 L 8 8 L 6 8 Z M 11 8 L 13 8 L 13 11 L 16 11 L 16 13 L 11 13 Z M 6 16 L 8 16 L 8 18 L 6 18 Z M 16 16 L 18 16 L 18 18 L 16 18 Z" fill="var(--amber)"></path></svg>
                Latency
              </div>
              <h3 class="three-col-heading">Stop waiting.</h3>
              <p class="three-col-text three-col-text--dim">DeepSeek V4 Flash streams first tokens in &lt;300ms via DeepInfra. No round-trip costs per token. $0.10/1M input, $0.20/1M output — fully transparent.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>
    <div class="section-divider"></div>

    <!-- ═══ 6. HOW IT WORKS ═══ -->
    <section class="how-section" id="our-approach">
      <div class="container">
        <div class="how-intro">
          <div class="badge how-intro-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 10 4 L 16 4 L 16 6 L 10 6 Z M 10 16 L 16 16 L 16 18 L 10 18 Z M 16 6 L 18 6 L 18 8 L 16 8 Z M 18 8 L 20 8 L 20 14 L 18 14 Z M 6 8 L 8 8 L 8 14 L 6 14 Z M 8 6 L 10 6 L 10 8 L 8 8 Z M 8 14 L 10 14 L 10 16 L 8 16 Z M 6 16 L 8 16 L 8 18 L 6 18 Z M 4 18 L 6 18 L 6 20 L 4 20 Z M 16 14 L 18 14 L 18 16 L 16 16 Z" fill="var(--amber)"></path></svg>
            Our Approach
          </div>
          <h2 class="how-intro-heading section-title">Transparency beats scale.</h2>
          <p class="how-intro-body">Freeport is a purpose-built system — device-code auth, DeepSeek V4 streaming, sponsor slot economics, and BYOK — engineered together for one job: real coding work, worldwide.</p>
        </div>

        <div class="how-stepper">
          <div class="how-steps-left">
            <button class="how-step active" data-step="1" onclick="setHowStep(1,true)" aria-label="Step 1: Device-code authorization">
              <div class="how-step-progress"><div class="how-step-progress-fill"></div></div>
              <div class="how-step-header">
                <div class="how-step-num">Step 01</div>
                <h3>Device-code authorization, zero secrets in config.</h3>
              </div>
              <div class="how-step-body"><div class="how-step-body-inner">
                <p>Run <code style="color:var(--amber)">freeport login</code> from any terminal. A unique device code is generated and your browser opens a confirmation page.</p>
                <p>You approve with your email. The CLI polls until the token arrives. No API keys pasted into config files. No clipboard sniffing.</p>
              </div></div>
            </button>
            <button class="how-step" data-step="2" onclick="setHowStep(2,true)" aria-label="Step 2: DeepSeek V4 stream">
              <div class="how-step-progress"><div class="how-step-progress-fill"></div></div>
              <div class="how-step-header">
                <div class="how-step-num">Step 02</div>
                <h3>DeepSeek V4 Flash streams at &lt;300ms first-token.</h3>
              </div>
              <div class="how-step-body"><div class="how-step-body-inner">
                <p>Sessions are routed through DeepInfra-hosted DeepSeek V4 Flash. You see tokens streaming in real time at 118 tokens/sec average throughput.</p>
                <p>Full session cost is shown per session: $0.10/1M input · $0.20/1M output. No hidden margins. No surprise bills.</p>
              </div></div>
            </button>
            <button class="how-step" data-step="3" onclick="setHowStep(3,true)" aria-label="Step 3: Sponsor slots fund the free tier">
              <div class="how-step-progress"><div class="how-step-progress-fill"></div></div>
              <div class="how-step-header">
                <div class="how-step-num">Step 03</div>
                <h3>Sponsor slots fund the free tier transparently.</h3>
              </div>
              <div class="how-step-body"><div class="how-step-body-inner">
                <p>Free-tier sessions are funded by a single non-intrusive sponsor line shown at session start. Each impression earns ~$0.03 ad inventory value — enough to cover DeepSeek V4 Flash cost per session.</p>
                <p>Pro users ($6/mo via Paddle) get zero ads, 6 sessions/day, and priority routing.</p>
              </div></div>
            </button>
          </div>

          <div class="how-illustration">
            <div class="shader-overlay-card" id="howCard">
              <span class="card-title" id="howCardTitle">Auth Flow</span>
              <div class="card-content active" data-content="1">
                <span class="hl-dim">Device pairing steps</span><br><br>
                <span class="hl-amber">λ</span> <span class="hl-bright">freeport login</span><br>
                <span class="hl-dim">› Requesting device code...</span><br>
                <span class="hl-amber">✓</span> <span class="hl-bright">Code: FP-A7X9</span><br>
                <span class="hl-dim">› Opening browser for approval</span><br>
                <span class="hl-dim">› Polling status...</span><br><br>
                <span class="hl-green">✓ PAIRED SUCCESSFULLY</span><br>
                <span class="hl-dim">Token issued for dev@you.com</span>
              </div>
              <div class="card-content" data-content="2">
                <span class="hl-dim">Session token economics</span><br><br>
                <span class="hl-amber">Provider:</span> DeepInfra (DeepSeek V4 Flash)<br>
                <span class="hl-amber">Input:</span> <span class="hl-green">$0.10 / 1M tokens</span><br>
                <span class="hl-amber">Output:</span> <span class="hl-green">$0.20 / 1M tokens</span><br>
                <span class="hl-amber">P50 latency:</span> <span class="hl-green">240ms</span><br><br>
                <span class="hl-dim">Prompt: 42,150 tokens (85% cache hit)</span><br>
                <span class="hl-dim">Output: 2,840 tokens</span><br>
                <span class="hl-amber">Total session cost: </span><span class="hl-green">$0.0031</span>
              </div>
              <div class="card-content" data-content="3">
                <span class="hl-dim">Sponsor slot (non-intrusive)</span><br><br>
                <span class="hl-amber">✦ Sponsor Spotlight:</span><br>
                <span class="hl-bright">Neon Postgres</span> — serverless branches<br>
                <span class="hl-dim">→ neon.tech</span><br><br>
                <span class="hl-dim">────────────────────────────────</span><br>
                <span class="hl-green">✓ Impression: +$0.03 inventory</span><br>
                <span class="hl-green">✓ Session fully funded</span><br>
                <span class="hl-dim">Happy coding! 🚀</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 7. CAPABILITIES ═══ -->
    <section class="illust-features" id="capabilities">
      <div class="container">
        <div class="badge" style="margin-bottom:1.5rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 6 4 L 8 4 L 8 2 L 10 2 L 10 4 L 14 4 L 14 2 L 16 2 L 16 4 L 18 4 L 18 6 L 6 6 Z M 6 18 L 18 18 L 18 20 L 16 20 L 16 22 L 14 22 L 14 20 L 10 20 L 10 22 L 8 22 L 8 20 L 6 20 Z M 18 6 L 20 6 L 20 8 L 22 8 L 22 10 L 20 10 L 20 14 L 22 14 L 22 16 L 20 16 L 20 18 L 18 18 Z M 4 6 L 6 6 L 6 18 L 4 18 L 4 16 L 2 16 L 2 14 L 4 14 L 4 10 L 2 10 L 2 8 L 4 8 Z M 15 15 L 17 15 L 17 17 L 15 17 Z M 15 7 L 17 7 L 17 9 L 15 9 Z M 7 7 L 9 7 L 9 9 L 7 9 Z M 7 15 L 9 15 L 9 17 L 7 17 Z" fill="var(--amber)"></path></svg>
          Capabilities
        </div>
        <h2 class="section-title" style="margin-bottom:2rem;text-align:center;">Your workflow, unleashed.</h2>
        <div class="illust-grid">
          <div class="illust-card">
            <div class="illust-label">[ 01 ]</div>
            <h3>Understands your architecture.</h3>
            <p>Builds a connected model of modules, dependencies, and relationships so reasoning happens across files and aligns with your existing design.</p>
          </div>
          <div class="illust-card">
            <div class="illust-label">[ 02 ]</div>
            <h3>Tracks relationships, prevents breakage.</h3>
            <p>Edits that respect function contracts, type boundaries, and dependency graphs — reducing bugs and regressions across your codebase.</p>
          </div>
          <div class="illust-card">
            <div class="illust-label">[ 03 ]</div>
            <h3>Strategizes before acting.</h3>
            <p>Explore → Plan → Execute workflows ensure multiple steps are reasoned out before any changes occur.</p>
          </div>
          <div class="illust-card">
            <div class="illust-label">[ 04 ]</div>
            <h3>Executes complex coding workflows.</h3>
            <p>From refactors to test generation to feature builds — coordinate tools, code edits, web search, and shell commands as needed.</p>
          </div>
          <div class="illust-card">
            <div class="illust-label">[ 05 ]</div>
            <h3>Device-code pairing. No clipboard leaks.</h3>
            <p>OAuth2-style device authorization means you never paste API keys anywhere. Approve from your browser; the CLI receives the token automatically.</p>
          </div>
          <div class="illust-card">
            <div class="illust-label">[ 06 ]</div>
            <h3>Worldwide Paddle checkout.</h3>
            <p>Upgrading shouldn't require a US billing address. Native Paddle integration supports localized cards, PayPal, and regional payment methods across MENA, LatAm, Africa, and Asia.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 8. STATS STRIP ═══ -->
    <section>
      <div class="stats-strip">
        <div class="stat-box">
          <span class="stat-label">Sessions / Day</span>
          <span class="stat-value">3</span>
          <span class="stat-note">Free tier, daily reset</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Privacy</span>
          <span class="stat-value">100%</span>
          <span class="stat-note">Zero code telemetry</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">First Token</span>
          <span class="stat-value">&lt;300ms</span>
          <span class="stat-note">DeepSeek V4 Flash stream</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">Checkout</span>
          <span class="stat-value">Global</span>
          <span class="stat-note">Paddle worldwide billing</span>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 9. TERMINAL SECTION ═══ -->
    <section class="terminal-section grid-bg" id="terminal-demo">
      <div class="container">
        <div class="term-header">
          <div class="badge term-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 2 13 L 8 13 L 8 15 L 6 15 L 6 20 L 4 20 L 4 15 L 2 15 Z M 16 15 L 18 15 L 18 4 L 20 4 L 20 15 L 22 15 L 22 17 L 20 17 L 20 20 L 18 20 L 18 17 L 16 17 Z M 9 7 L 11 7 L 11 4 L 13 4 L 13 7 L 15 7 L 15 9 L 9 9 Z M 11 11 L 13 11 L 13 20 L 11 20 Z M 4 4 L 6 4 L 6 11 L 4 11 Z" fill="var(--amber)"></path></svg>
            CLI Experience
          </div>
          <h2 class="display term-title">Built for control freaks.</h2>
        </div>

        <div class="terminal-artifact">
          <!-- Blueprint annotations LEFT -->
          <div class="terminal-blueprint-left">
            <div class="bp-anno bp-at-34">
              <div class="bp-text">
                <div class="bp-title">DeepSeek V4 Flash</div>
                <div class="bp-desc">240ms first-token stream</div>
              </div>
              <div class="bp-line-left"></div>
              <div class="bp-dot"></div>
            </div>
            <div class="bp-anno bp-at-50">
              <div class="bp-text">
                <div class="bp-title">Device Auth</div>
                <div class="bp-desc">OAuth2-style, zero secrets</div>
              </div>
              <div class="bp-line-left"></div>
              <div class="bp-dot"></div>
            </div>
            <div class="bp-anno bp-at-66">
              <div class="bp-text">
                <div class="bp-title">Context Graph</div>
                <div class="bp-desc">Repo-wide code understanding</div>
              </div>
              <div class="bp-line-left"></div>
              <div class="bp-dot"></div>
            </div>
          </div>

          <!-- Blueprint annotations RIGHT -->
          <div class="terminal-blueprint-right">
            <div class="bp-anno bp-at-34">
              <div class="bp-dot"></div>
              <div class="bp-line-right"></div>
              <div class="bp-text">
                <div class="bp-title">Sponsor Slots</div>
                <div class="bp-desc">1 line, session-funded</div>
              </div>
            </div>
            <div class="bp-anno bp-at-50">
              <div class="bp-dot"></div>
              <div class="bp-line-right"></div>
              <div class="bp-text">
                <div class="bp-title">Daily Resets</div>
                <div class="bp-desc">3 free sessions, UTC midnight</div>
              </div>
            </div>
            <div class="bp-anno bp-at-66">
              <div class="bp-dot"></div>
              <div class="bp-line-right"></div>
              <div class="bp-text">
                <div class="bp-title">Paddle Checkout</div>
                <div class="bp-desc">Local billing worldwide</div>
              </div>
            </div>
          </div>

          <div class="monitor-casing">
            <div class="monitor-vents">
              <div class="monitor-vent"></div><div class="monitor-vent"></div>
              <div class="monitor-vent"></div><div class="monitor-vent"></div><div class="monitor-vent"></div>
            </div>
            <div class="monitor-screen-bezel">
              <div class="terminal-window">
                <div class="terminal-bar">
                  <div class="terminal-dots"><span></span><span></span><span></span></div>
                  <span class="terminal-title">freeport://local · session active</span>
                  <div class="blink-dot-sm"></div>
                </div>
                <div class="terminal-body">
                  <div class="term-line"><span class="prompt">λ</span> <span class="cmd">freeport login</span></div>
                  <div class="term-line term-line-gap-sm">
                    <pre class="term-ascii">  ███████╗██████╗  
  ██╔════╝██╔══██╗ 
  █████╗  ██████╔╝ 
  ██╔══╝  ██╔═══╝  
  ██║     ██║      
  ╚═╝     ╚═╝      </pre>
                  </div>
                  <div class="term-line output term-line-gap-sm">&gt; Requesting device code...</div>
                  <div class="term-line output">&gt; Code: <span class="success">FP-X7K2</span> · Browser opening...</div>
                  <div class="term-line output">&gt; Polling status... approved by dev@you.com</div>
                  <div class="term-line term-line-gap"><span class="success">✓</span> <span class="cmd">Paired.</span> <span class="info">Network: <span class="success">ON</span> · Telemetry: OFF</span></div>
                  <div class="term-line term-line-gap">
                    <span class="prompt">λ</span> <span id="typing-text" class="cmd">freeport "refactor auth middleware to </span><span class="cursor-block"></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="monitor-bezel-bottom">
              <span>DeepSeek V4 Flash</span>
              <div class="monitor-led"></div>
              <span class="model-tag">FP-2.4</span>
              <span>DeepInfra Hosted</span>
            </div>
          </div>
        </div>

        <!-- Mobile annotations grid -->
        <div class="terminal-annotations-grid">
          <div class="terminal-anno-item"><div class="terminal-anno-title">DeepSeek V4 Flash</div><div class="terminal-anno-desc">240ms first-token stream</div></div>
          <div class="terminal-anno-item"><div class="terminal-anno-title">Sponsor Slots</div><div class="terminal-anno-desc">1 line, session-funded</div></div>
          <div class="terminal-anno-item"><div class="terminal-anno-title">Device Auth</div><div class="terminal-anno-desc">OAuth2-style, zero secrets</div></div>
          <div class="terminal-anno-item"><div class="terminal-anno-title">Daily Resets</div><div class="terminal-anno-desc">3 free sessions, UTC midnight</div></div>
          <div class="terminal-anno-item"><div class="terminal-anno-title">Context Graph</div><div class="terminal-anno-desc">Repo-wide code understanding</div></div>
          <div class="terminal-anno-item"><div class="terminal-anno-title">Paddle Checkout</div><div class="terminal-anno-desc">Local billing worldwide</div></div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 10. PRICING (HIDDEN FOR EARLY-ACCESS WAITLIST PHASE) ═══ -->
    <section class="pricing-section" id="pricing" style="display:none;">
      <div class="container">
        <div class="badge" style="margin-bottom:1.5rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 5 5 L 19 5 L 19 7 L 5 7 Z M 5 17 L 19 17 L 19 19 L 5 19 Z M 19 7 L 21 7 L 21 17 L 19 17 Z M 3 7 L 5 7 L 5 17 L 3 17 Z" fill="var(--amber)"></path></svg>
          Pricing
        </div>
        <h2 class="section-title" style="margin-bottom:1rem;text-align:center;">Simple, honest pricing.</h2>
        <p style="text-align:center;color:var(--paper-dim);font-size:1rem;max-width:500px;margin:0 auto 0;">Start free, support sustainable open-source development, or bring your own API keys.</p>

        <div class="pricing-grid">
          <!-- Free -->
          <div class="pricing-card">
            <div class="pricing-label">Public Utility</div>
            <h3>Free</h3>
            <div class="pricing-price">$0</div>
            <div class="pricing-period">forever · daily reset</div>
            <hr class="pricing-divider">
            <ul class="pricing-features">
              <li>3 full sessions / day (daily reset)</li>
              <li>DeepSeek V4 Flash powered</li>
              <li>1 non-intrusive sponsor slot per session</li>
              <li>Device-code authorization</li>
              <li>Zero prompt training or telemetry</li>
            </ul>
            <a href="#install-cta" class="btn-chamfer btn-outline-light" style="width:100%;justify-content:center;">Install Free CLI</a>
          </div>

          <!-- Pro -->
          <div class="pricing-card featured">
            <div class="pricing-label">Pro Supporter</div>
            <h3>Pro</h3>
            <div class="pricing-price">$6</div>
            <div class="pricing-period">per month · via Paddle</div>
            <hr class="pricing-divider">
            <ul class="pricing-features">
              <li>6 full sessions / day (daily reset)</li>
              <li>100% ad-free experience</li>
              <li>Priority DeepSeek V4 Pro routing</li>
              <li>Localized Paddle billing worldwide</li>
              <li>Priority support via email</li>
            </ul>
            <a href="/pricing" class="btn-chamfer btn-amber" style="width:100%;justify-content:center;">Upgrade to Pro</a>
          </div>

          <!-- BYOK -->
          <div class="pricing-card">
            <div class="pricing-label">Power User</div>
            <h3>BYOK</h3>
            <div class="pricing-price">$0</div>
            <div class="pricing-period">bring your own keys</div>
            <hr class="pricing-divider">
            <ul class="pricing-features">
              <li>Unlimited coding sessions</li>
              <li>DeepSeek, Anthropic & OpenAI keys</li>
              <li>Zero ads & zero intermediaries</li>
              <li>Full subagent orchestration</li>
              <li>Direct provider routing, zero markup</li>
            </ul>
            <a href="#install-cta" class="btn-chamfer btn-outline-light" style="width:100%;justify-content:center;">Configure BYOK</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 11. EARLY ACCESS & WAITLIST ═══ -->
    <section id="early-access" class="promise-section">
      <div class="container ea-container">
        <div class="waitlist-card">
          <div class="badge ea-badge" style="margin-bottom:1.25rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 12 2 L 15 8 L 22 9 L 17 14 L 18 21 L 12 17 L 6 21 L 7 14 L 2 9 L 9 8 Z" fill="var(--amber)"></path></svg>
            Early Access Waitlist · Batch Rollout
          </div>
          <h2 class="display ea-title" style="margin-bottom:0.75rem;">Get Access to Unlocked AI Coding.</h2>
          <p class="ea-desc" style="max-width:600px;margin:0 auto 1.5rem;">Freeport is rolling out free daily access in community-funded batches so the service remains 100% sustainable worldwide with zero bait-and-switch. Reserve your place in queue below.</p>
          
          <form id="waitlist-form" onsubmit="submitWaitlist(event)" class="waitlist-form">
            <div class="waitlist-input-group">
              <input id="waitlist-email" type="email" required placeholder="developer@domain.com" class="waitlist-input" aria-label="Your developer email">
              <button type="submit" id="waitlist-btn" class="btn-chamfer btn-amber waitlist-submit-btn">Reserve Spot &rarr;</button>
            </div>
            <div id="waitlist-status" class="waitlist-status" style="display:none;"></div>
          </form>

          <div class="waitlist-perks">
            <div class="waitlist-perk"><span style="color:var(--amber);">✦</span> 3 daily sessions (DeepSeek V4 Flash)</div>
            <div class="waitlist-perk"><span style="color:var(--amber);">✦</span> Local checkout rails worldwide</div>
            <div class="waitlist-perk"><span style="color:var(--amber);">✦</span> 100% zero code telemetry</div>
          </div>

          <!-- Community Funding & Sponsor Milestone Card -->
          <div style="margin-top:2.5rem;padding:1.5rem;border:1px solid rgba(255,176,0,0.3);background:rgba(255,176,0,0.04);border-radius:6px;text-align:left;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
              <span class="badge" style="font-size:0.65rem;">Community Funded · Transparent Runway</span>
              <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--amber);">$25 unlocks ~500 free sessions</span>
            </div>
            <p style="font-size:0.88rem;color:var(--paper-dim);line-height:1.5;margin-bottom:14px;">
              Freeport is an independent, developer-first public utility. Every community dollar directly funds DeepSeek inference credits for developers in underserved regions.
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;">
              <a href="https://github.com/sponsors/hazemmrad17" target="_blank" rel="noopener noreferrer" class="btn-chamfer btn-amber" style="padding:0.6rem 1.2rem;font-size:0.75rem;">
                ♥ Sponsor on GitHub
              </a>
              <a href="https://buymeacoffee.com/freeport" target="_blank" rel="noopener noreferrer" class="btn-chamfer btn-outline-light" style="padding:0.6rem 1.2rem;font-size:0.75rem;">
                ☕ Buy Me a Coffee
              </a>
              <a href="https://ko-fi.com/freeport" target="_blank" rel="noopener noreferrer" class="btn-chamfer btn-outline-light" style="padding:0.6rem 1.2rem;font-size:0.75rem;">
                🪙 Ko-fi
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>

    <!-- ═══ 12. FAQ ═══ -->
    <section class="faq-section" id="faq">
      <div class="container">
        <div class="badge" style="margin-bottom:2rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M 10 2 L 14 2 L 14 4 L 10 4 Z M 8 4 L 10 4 L 10 6 L 8 6 Z M 14 4 L 16 4 L 16 6 L 14 6 Z M 6 6 L 8 6 L 8 8 L 6 8 Z M 16 6 L 18 6 L 18 8 L 16 8 Z M 6 8 L 8 8 L 8 14 L 6 14 Z M 16 8 L 18 8 L 18 14 L 16 14 Z M 14 14 L 16 14 L 16 16 L 14 16 Z M 14 16 L 14 18 L 12 18 L 12 16 Z M 12 20 L 14 20 L 14 22 L 12 22 Z" fill="var(--amber)"></path></svg>
          FAQ
        </div>
        <h2 class="section-title faq-title">Frequently asked questions.</h2>
        <div class="faq-list">
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">01</span>
              <span class="faq-question-text">What is Freeport?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>Freeport is an AI coding agent CLI powered by DeepSeek V4 Flash. It uses a device-code authorization flow, streams responses in real time, and funds the free tier via non-intrusive sponsor slots. Your code never leaves your machine — zero prompt telemetry, zero training on your data.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">02</span>
              <span class="faq-question-text">What model does Freeport use?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>Freeport uses DeepSeek V4 Flash hosted on DeepInfra for the free and Pro tiers. Pricing is fully transparent: $0.10/1M input tokens and $0.20/1M output tokens. BYOK users can route directly to DeepSeek, Anthropic, or OpenAI with zero intermediary markup.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">03</span>
              <span class="faq-question-text">How does the free tier work?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>The free tier provides 3 full sessions per day that reset at UTC midnight. Each session is funded by a single non-intrusive sponsor line shown at session start — earning ~$0.03 ad inventory value that covers the DeepSeek V4 Flash cost per session. No credit card required, ever.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">04</span>
              <span class="faq-question-text">How does the device-code login work?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>Run <code>freeport login</code>. A unique device code is generated server-side tied to your machine fingerprint. Your browser opens to approve with your email. The CLI polls until the auth token is returned. No API keys ever need to be pasted anywhere.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">05</span>
              <span class="faq-question-text">Will Freeport collect my code or data?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>No. Telemetry is strictly limited to session time and token counts for billing purposes. Your source code, prompts, and file contents are never stored, mined, or used to train any model. Proprietary repositories stay 100% private.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">06</span>
              <span class="faq-question-text">How does Paddle billing work for international users?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>Freeport uses Paddle as its merchant of record. Paddle handles localized pricing, regional tax compliance, and supports cards, PayPal, and local payment methods across MENA, LatAm, Africa, Southeast Asia, and more. Upgrading should never require a US billing address.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">07</span>
              <span class="faq-question-text">What is BYOK mode?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>Bring Your Own Keys (BYOK) lets power users plug in their own DeepSeek, Anthropic, or OpenAI API keys. Traffic routes directly to the provider with zero intermediary markup, zero session limits, and full subagent orchestration. Freeport acts purely as the local agent harness.</p></div></div>
          </details>
          <details class="faq-item">
            <summary class="faq-question">
              <span class="faq-question-number">08</span>
              <span class="faq-question-text">Is Freeport open source?</span>
              <span class="faq-chevron" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
            </summary>
            <div class="faq-answer-wrap"><div class="faq-answer"><p>Freeport is released under the Apache-2.0 license. The server, CLI, and SDK are all open source. Unit economics (DeepSeek V4 rates, session cost caps, sponsor slot values) are validated in the test suite and visible in the admin dashboard.</p></div></div>
          </details>
        </div>
      </div>
    </section>

    <div class="section-divider"></div>
    <div style="padding-top: 4rem;"><div class="section-divider" style="position:relative;top:-4rem;"></div></div>
  </main>

  <!-- ═══ 13. CTA SECTION ═══ -->
  <section class="cta-section">
    <!-- Oversized logo outline -->
    <svg class="cta-oversized-svg" viewBox="0 0 218.38 248.89" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89" stroke="rgba(240,237,230,0.08)" stroke-width="0.5" fill="none"/>
      <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41Z" stroke="rgba(240,237,230,0.08)" stroke-width="0.5" fill="none"/>
      <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95Z" stroke="rgba(240,237,230,0.08)" stroke-width="0.5" fill="none"/>
    </svg>

    <div class="container cta-container">
      <div class="cta-logo-wrap">
        <!-- Glow layer -->
        <svg class="cta-logo-glow" viewBox="0 0 218.38 248.89" fill="var(--amber)" xmlns="http://www.w3.org/2000/svg">
          <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89"/>
          <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41ZM131.16,146.62l19.85,13.78-20.76,33.93,4.62,2.98,24.74-39.66c-.23-2.9-21.57-14.66-24.79-17.8-1.81-.28-4.41,5.47-3.67,6.76ZM193.92,159.86c-.49-.55-4.85,1.94-5.82,2.46-4.05,2.16-18.33,9.87-20.86,12.32-1.98,1.92-1.18,4.52-1.26,7.03,1.72,1.83,23.41-13.4,27.09-14.39l.86-7.43Z"/>
          <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95ZM53.28,61.95c23.68,15.15,37.9,24.84,55.62,36.46,19.13-9.44,37.33-24.99,55.32-36.46,0,0-111.66-.46-110.94,0Z"/>
        </svg>
        <!-- Main logo -->
        <svg class="cta-logo" viewBox="0 0 218.38 248.89" fill="var(--amber)" xmlns="http://www.w3.org/2000/svg">
          <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89"/>
          <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41ZM131.16,146.62l19.85,13.78-20.76,33.93,4.62,2.98,24.74-39.66c-.23-2.9-21.57-14.66-24.79-17.8-1.81-.28-4.41,5.47-3.67,6.76ZM193.92,159.86c-.49-.55-4.85,1.94-5.82,2.46-4.05,2.16-18.33,9.87-20.86,12.32-1.98,1.92-1.18,4.52-1.26,7.03,1.72,1.83,23.41-13.4,27.09-14.39l.86-7.43Z"/>
          <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95ZM53.28,61.95c23.68,15.15,37.9,24.84,55.62,36.46,19.13-9.44,37.33-24.99,55.32-36.46,0,0-111.66-.46-110.94,0Z"/>
        </svg>
      </div>

      <div class="cta-heading-wrap">
        <h2>Break free from locked-down AI.</h2>
      </div>

      <p>No credit card. No usage meter. No code telemetry.</p>

      <div class="cta-btn-wrap">
        <button class="btn-chamfer btn-amber cta-btn" onclick="document.getElementById('install-cta').scrollIntoView({behavior:'smooth'})">
          Install Free CLI
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4v8a4 4 0 0 1-4 4H5"/><polyline points="9 12 5 16 9 20"/></svg>
        </button>
      </div>
      <p class="cta-fine-print">Apache-2.0 · Unit economics validated with DeepSeek V4</p>
    </div>
  </section>

  <!-- ═══ 14. FOOTER ═══ -->
  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <!-- Footer logo -->
          <a href="/">
            <svg class="footer-logo" viewBox="0 0 218.38 248.89" fill="var(--amber)" xmlns="http://www.w3.org/2000/svg">
              <polygon points="106.57 248.89 0 187.21 0 65.88 106.57 126.55 106.57 248.89"/>
              <path d="M110.94,248.89v-122.2l107.44-59.79v119.58l-107.44,62.41Z"/>
              <path d="M218.38,61.95l-109.54,60.25L0,61.95,108.82,0l109.56,61.95Z"/>
            </svg>
          </a>
          <p>Autonomous AI coding for developers worldwide. Generous daily resets, transparent token economics, zero code telemetry.</p>
        </div>
        <div class="footer-col">
          <h3>Product</h3>
          <ul>
            <li><a href="/pricing">Pricing</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#terminal-demo">CLI Demo</a></li>
            <li><a href="/admin?token=admin">Admin Dashboard</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h3>Links</h3>
          <ul>
            <li><a href="/login">Device Login</a></li>
            <li><a href="/welcome">Pro Welcome</a></li>
            <li><a href="mailto:support@freeport.dev">support@freeport.dev</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>Freeport © 2026 · Apache-2.0</span>
        <div class="footer-status">
          <div class="footer-status-dot"></div>
          <span>Unit economics validated · DeepSeek V4</span>
        </div>
      </div>
    </div>
  </footer>

  <script>
    // ── Copy install command ──
    function copyInstallCmd() {
      navigator.clipboard?.writeText('npm install -g freeport-ai').catch(() => {});
      const btns = document.querySelectorAll('.copy-btn');
      btns.forEach(b => { b.textContent = 'Copied!'; setTimeout(() => b.textContent = 'Copy', 2000); });
    }

    // ── How It Works stepper ──
    let howTimer = null;
    let currentStep = 1;
    function setHowStep(step, userTriggered = false) {
      if (userTriggered && howTimer) { clearInterval(howTimer); howTimer = null; }
      currentStep = step;
      document.querySelectorAll('.how-step').forEach((el, i) => {
        const active = (i + 1) === step;
        el.classList.toggle('active', active);
        const fill = el.querySelector('.how-step-progress-fill');
        if (fill) fill.style.animationPlayState = active ? 'running' : 'paused';
        const card = document.getElementById('howCard');
        if (card && active) {
          document.getElementById('howCardTitle').textContent =
            step === 1 ? 'Auth Flow' : step === 2 ? 'Token Economics' : 'Sponsor Slot';
          card.querySelectorAll('.card-content').forEach((c, ci) => c.classList.toggle('active', ci + 1 === step));
        }
      });
    }
    function startHowAutoAdvance() {
      howTimer = setInterval(() => {
        currentStep = (currentStep % 3) + 1;
        setHowStep(currentStep, false);
      }, 6000);
    }
    startHowAutoAdvance();

    // ── Eye blink ──
    function setupEyeBlink() {
      const t = document.querySelector('.eye-blink-target');
      if (!t) return;
      setInterval(() => {
        t.classList.add('shut');
        setTimeout(() => t.classList.remove('shut'), 200);
      }, 3500 + Math.random() * 2000);
    }
    setupEyeBlink();

    // ── Intersection Observer ──
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('is-visible', e.isIntersecting));
    }, { threshold: 0.1 });
    document.querySelectorAll('.signal-section, .offline-section, .cta-section').forEach(el => observer.observe(el));

    // ── Terminal typing animation ──
    const phrases = [
      'freeport "refactor auth middleware to use JWT"',
      'freeport "add unit tests for the payment module"',
      'freeport "fix the race condition in session.ts"',
      'freeport "generate API docs from TypeScript types"',
    ];
    let phraseIdx = 0, charIdx = 0, typing = true;
    const typingEl = document.getElementById('typing-text');
    function typeLoop() {
      if (!typingEl) return;
      if (typing) {
        if (charIdx < phrases[phraseIdx].length) {
          typingEl.textContent = phrases[phraseIdx].slice(0, ++charIdx);
          setTimeout(typeLoop, 55 + Math.random() * 40);
        } else {
          typing = false;
          setTimeout(typeLoop, 2400);
        }
      } else {
        if (charIdx > 0) {
          typingEl.textContent = phrases[phraseIdx].slice(0, --charIdx);
          setTimeout(typeLoop, 20);
        } else {
          typing = true;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(typeLoop, 600);
        }
      }
    }
    setTimeout(typeLoop, 5000);

    // ── Early Access Waitlist submission ──
    async function submitWaitlist(e) {
      e.preventDefault();
      const emailInput = document.getElementById('waitlist-email');
      const btn = document.getElementById('waitlist-btn');
      const status = document.getElementById('waitlist-status');
      if (!emailInput || !emailInput.value) return;

      const originalBtnText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get('source') || urlParams.get('ref') || urlParams.get('utm_source') || 'landing_waitlist';

      try {
        const resp = await fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailInput.value.trim(), source })
        });
        const data = await resp.json();
        status.style.display = 'block';

        if (resp.ok && data.success) {
          status.className = 'waitlist-status success';
          status.innerHTML = '<span class="pos-badge">#' + data.position + '</span> <strong>' +
            (data.alreadyJoined ? "You're already in line!" : "Spot reserved!") +
            '</strong> ' + data.message;
          emailInput.value = '';
          btn.textContent = 'Joined!';
        } else {
          status.className = 'waitlist-status error';
          status.textContent = data.message || 'Error joining waitlist. Please try again.';
          btn.disabled = false;
          btn.textContent = originalBtnText;
        }
      } catch (err) {
        status.style.display = 'block';
        status.className = 'waitlist-status error';
        status.textContent = 'Network error. Please try again.';
        btn.disabled = false;
        btn.textContent = originalBtnText;
      }
    }

  </script>
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chivo+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #070709;
      color: #f0ede6;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      text-align: center;
      max-width: 540px;
      padding: 48px 36px;
      background: #0e0e12;
      border: 1px solid rgba(255, 176, 0, 0.35);
      border-radius: 8px;
      box-shadow: 0 0 35px rgba(255, 176, 0, 0.12);
    }
    .check {
      width: 64px; height: 64px; border-radius: 50%;
      background: #ffb000; color: #070709;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px; font-size: 2rem; font-weight: 900;
      box-shadow: 0 0 20px rgba(255, 176, 0, 0.4);
    }
    h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 12px; }
    p { color: rgba(240, 237, 230, 0.7); font-size: 1rem; line-height: 1.6; margin-bottom: 8px; }
    .next {
      background: #14141a; border: 1px solid rgba(240, 237, 230, 0.12);
      border-radius: 6px; padding: 20px; margin-top: 28px; text-align: left;
    }
    .next h2 { font-family: 'Chivo Mono', monospace; font-size: 0.75rem; color: #ffb000; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 700; }
    code { font-family: 'Chivo Mono', monospace; background: #060608; border: 1px solid rgba(240, 237, 230, 0.1); padding: 3px 8px; border-radius: 4px; font-size: 0.9em; color: #ffb000; }
    .home-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: #ffb000; color: #070709; font-family: 'Chivo Mono', monospace;
      font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      text-decoration: none; padding: 0.85rem 1.8rem; margin-top: 28px;
      clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
      transition: background 0.15s;
    }
    .home-btn:hover { background: #ffbe26; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>You're a Pro Supporter</h1>
    <p>Payment received. Your subscription is active:</p>
    <p><strong style="color:#f0ede6">6 sessions/day &middot; priority routing &middot; 100% ad-free</strong></p>
    <div class="next">
      <h2>Next step</h2>
      <p>Log in from the CLI with the same email to activate your Pro tier access instantly:</p>
      <p style="margin-top:10px"><code>freeport login</code> &rarr; approve in browser &rarr; done.</p>
    </div>
    <a href="/" class="home-btn">Back to Home</a>
  </div>
</body>
</html>`)
})
