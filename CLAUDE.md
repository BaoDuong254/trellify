# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all workspace packages (from root)
pnpm install

# Development — runs client (port 5173) and server (port 3000) in parallel
pnpm start:dev

# Run only client or only server
pnpm fe --filter=client -- start:dev
pnpm be --filter=server -- start:dev

# Lint / format
pnpm lint
pnpm lint:fix
pnpm format:fix

# Type-check all packages
pnpm typecheck

# Production build (must be in this order — packages first)
pnpm pkg:build
pnpm apps:build
pnpm start:prod
```

There is no automated test suite yet; API endpoints are tested via the Postman collection at `postman/collections/Trellify.postman_collection.json`.

## Monorepo Layout

pnpm workspaces with Turbo orchestration:

- `apps/client` — React 19 + Vite + SWC frontend
- `apps/server` — Express 5 + MongoDB backend
- `packages/shared` — Zod schemas and constants shared between client and server (`@workspace/shared`)
- `packages/ui` — shadcn/ui-style primitive components (`@workspace/ui`)
- `packages/eslint` / `packages/typescript` — shared configs consumed by all workspaces

## Backend Architecture

Strict layered pattern: **Controller → Service → Model → Database**

- **Controllers** (`apps/server/src/controllers/`) — thin HTTP handlers only; call service methods, pass errors to `next()`
- **Services** (`apps/server/src/services/`) — all business logic, throw `ApiError` instances
- **Models** (`apps/server/src/models/`) — direct MongoDB operations only; validate with Zod before insert/update; always filter `_destroy: false`
- **Validations** (`apps/server/src/validations/`) — Zod middleware applied at the route level using schemas from `@workspace/shared`

MongoDB native driver is used (not Mongoose). Soft delete only — set `_destroy: true`, never hard-delete. Never expose `_destroy` to the frontend. Prefer aggregation pipelines over N+1 queries.

Error messages are i18n keys (e.g., `"Error.BoardNotFound"`). Never expose stack traces in production.

## Frontend Architecture

**Page → Container Component → Presentational Component → UI Primitive**

- **Pages** (`apps/client/src/pages/`) — route components; connect to Redux, orchestrate data fetching
- **Components** (`apps/client/src/components/`) — reusable UI built on MUI 7; style via `sx` prop
- **Redux** (`apps/client/src/redux/`) — Redux Toolkit slices: `activeBoard`, `user`, `activeCard`, `notifications`; only `user` is persisted to localStorage via redux-persist
- **APIs** (`apps/client/src/apis/`) — Axios functions; centralized HTTP client with interceptors in `src/utils/http.ts`
- **Real-time** — Socket.io client initialized in `src/socketClient.ts`

Drag-and-drop is handled by `@dnd-kit`. Markdown editing uses `@uiw/react-md-editor`.

## Critical Rules

**Imports** — always use absolute imports via `src/*` alias; use `@workspace/*` for internal packages; no deep relative paths (`../../../`).

**Type safety** — no `any` (use `unknown`); explicit return types everywhere; no `as` type assertions unless unavoidable.

**Validation** — all Zod schemas live in `packages/shared/src/schemas/`; validate at both route level (server middleware) and model level (before DB writes).

**Security** — never expose password, tokens, or secrets in responses or logs; always use env variables for secrets.

## Environment Variables

Copy `.env.example` files in both `apps/server/` and `apps/client/` to `.env`.

Key server variables: `PORT`, `NODE_ENV`, `CLIENT_URL`, `MONGODB_URI`, `DATABASE_NAME`, JWT secrets, `BREVO_API_KEY`, `CLOUDINARY_*`.  
Key client variable: `VITE_API_URL` (defaults to `http://localhost:3000/api/v1`).

## Git Conventions

Conventional Commits format: `feat(scope): description`. Pre-commit hooks enforce lint + format; commit-msg hook validates format. Branch naming: `feature/*`, `bugfix/*`, `hotfix/*` off `main`.
