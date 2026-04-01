# RCM Dashboard — Tabby CBUAE SVF Compliance

Regulatory Compliance Management dashboard for tracking CBUAE SVF reporting obligations, deadlines, and escalation workflows.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to GitHub Pages (Free Hosting)

This repo includes a GitHub Actions workflow that auto-deploys on every push to `main`.

1. Go to **Settings → Pages → Source** → select **GitHub Actions**
2. Push code to `main` — it deploys automatically
3. Your dashboard will be live at: `https://niv3tha2003.github.io/rcm-dashboard-/`

## Deploy to Vercel (Alternative)

1. Go to [vercel.com](https://vercel.com) → Import this GitHub repo
2. Framework: Vite → Deploy
3. Done. Auto-deploys on every push.

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Recharts
- Lucide React icons

## Roadmap

- [ ] Phase 1: Static dashboard (current)
- [ ] Phase 2: Notion API backend
- [ ] Phase 3: Slack notification engine
- [ ] Phase 4: Self-hosted on Tabby AI server (Docker Compose)
