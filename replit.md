# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### AppReady (`artifacts/app-ready`)
- React + Vite single-page app at `/`
- Users paste an app URL, click "Check My App", and get an AI-powered readiness report
- Three states: landing, loading, results
- Results show overall readiness % (circular progress), 4 category scores (Performance, Mobile Friendliness, Security, SEO), and top 3 fixes

### API Server (`artifacts/api-server`)
- Express 5 server at `/api`
- `POST /api/analyze` — takes `{ url }`, calls Google Gemini API, returns readiness report
- Requires `GEMINI_API_KEY` environment secret

## Environment Secrets

- `SESSION_SECRET` — session signing key
- `GEMINI_API_KEY` — Google Gemini API key for app analysis

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
