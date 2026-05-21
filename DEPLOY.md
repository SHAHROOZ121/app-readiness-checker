# Vercel deployment

You develop on **Windows**; Vercel builds on **Linux** in the cloud. Both need their platform-specific native packages (esbuild, rollup, etc.) — do not use Replit-only pnpm overrides that block `win32-x64`.

## Required dashboard settings

In the Vercel project → **Settings** → **Build and Deployment**:

1. **Root Directory**
   - Use **empty** (repo root), **or** `artifacts/api-server` (both work with the included `vercel.json` files).

2. **Build Command** — leave **empty** (use `vercel.json` from the repo).

3. **Install Command** — leave **empty** (use `vercel.json` from the repo).

4. **Output Directory** — leave **empty** (use `vercel.json` from the repo).

If Build Command is set to the old value  
`pnpm --filter @workspace/app-ready run build && rm -rf ./public && ...`  
deploys will fail when Root Directory is `artifacts/api-server` (wrong copy paths). Clear the override and redeploy.

## Environment variables (required for URL checks)

Without this, the app loads but **every analyze request fails**.

1. Get a key: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → enable **PageSpeed Insights API** → Credentials → Create API key.
2. In Vercel → your project → **Settings** → **Environment Variables**:
   - Name: `PAGESPEED_API_KEY`
   - Value: your API key
   - Environments: Production (and Preview if you use preview URLs)
3. **Redeploy** after saving (Deployments → ⋯ → Redeploy).

| Variable | Required |
|----------|----------|
| `PAGESPEED_API_KEY` | Yes — Google PageSpeed Insights API key |

## Deploy

```bash
git add .
git commit -m "Fix Vercel build script and rollup overrides"
git push
```

Vercel redeploys automatically after push.
