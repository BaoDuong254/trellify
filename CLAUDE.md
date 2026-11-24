# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Area-specific rules live next to the code and load when you work there:

| File                          | Covers                                                                     |
| ----------------------------- | -------------------------------------------------------------------------- |
| `apps/server/CLAUDE.md`       | layers, sockets, cache, bloom filter, Redis, BullMQ, metrics, server tests |
| `apps/client/CLAUDE.md`       | client architecture, auth refresh, Sentry tunnel, CSP hashes, client tests |
| `infra/CLAUDE.md`             | ArgoCD/k3s, kind + Tilt dev cluster, Task ops, infra validation            |
| `.github/CLAUDE.md`           | CI pipeline, image build/pin/deploy workflow                               |
| `k6/CLAUDE.md`                | load testing                                                               |
| `e2e/CLAUDE.md`               | Playwright                                                                 |
| `.claude/rules/lighthouse.md` | Unlighthouse audits (`unlighthouse.config.ts`)                             |

## Commands

```bash
pnpm install                 # from root
pnpm start:dev               # client (5173), API (3000) and BullMQ worker in parallel
pnpm fe start:dev            # `fe`/`be`/`shared`/`e2e` alias `pnpm --filter=<pkg>`
pnpm be start:dev            # API only (no worker)
pnpm be start:worker:dev     # worker only
pnpm be start:debug          # API with --inspect=9229

pnpm lint | lint:fix | format:fix | typecheck
pnpm knip && pnpm knip:production   # pre-commit AND CI; a failure blocks the commit
bash scripts/check-csp-hashes.sh    # pre-commit AND CI

pnpm pkg:build && pnpm apps:build && pnpm start:prod   # order matters — packages export from dist/
pnpm cz                      # guided conventional commit

pnpm test                    # every Vitest suite with coverage
pnpm shared test             # shared Zod schemas only
pnpm be test:unit            # no Docker needed
pnpm be test:integration     # needs Docker (Testcontainers mongo:8.0 + redis:8-alpine)
pnpm fe test                 # jsdom + Testing Library + MSW
```

Vitest everywhere except E2E. Specs are `*.spec.ts(x)`; both `tsconfig.build.json` files exclude `**/*spec.ts` and `vitest.config.ts`, so nothing test-related reaches `dist/`. knip: production files are the `!`-suffixed `project` globs in `knip.json`; test-only folders (`apps/server/test`, `apps/client/src/test`, `e2e`) are deliberately left unsuffixed so `knip --production` ignores them.

## Monorepo Layout

pnpm workspaces + Turbo:

- `apps/client` — React 19 + Vite + SWC frontend
- `apps/server` — Express 5 + MongoDB + Socket.io + BullMQ backend (two entrypoints: `src/index.ts`, `src/worker.ts`)
- `packages/shared` — Zod schemas, socket event constants, logger (`@workspace/shared`)
- `packages/eslint` / `packages/typescript` — shared configs
- `infra/` — Kubernetes manifests reconciled by ArgoCD
- `k6/` — load tests (excluded from knip)
- `unlighthouse.config.ts` — Lighthouse audits of the deployed site

`@workspace/shared` is consumed through built subpath exports only: `@workspace/shared/schemas/*`, `@workspace/shared/utils/*` and `@workspace/shared/constants/*` (no root import). Because it resolves to `dist/`, run `pnpm pkg:build` after changing shared code if apps start reporting stale or missing exports. A new top-level folder under `packages/shared/src/` needs its own entry in the package's `exports` - dev (`tsx`, Vite) and `pnpm typecheck` resolve through tsconfig `paths` and never notice, but `tsconfig.build.json` drops that mapping, so the server's `apps:build` fails with TS2307 and plain Node rejects the import with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

### Adding a dependency

Versions are centralized via **pnpm catalog**. Never write a version number in a workspace `package.json`:

1. Add `<pkg>: <version>` under `catalog:` in `pnpm-workspace.yaml`
2. Reference it as `"<pkg>": "catalog:"` in the target workspace's `package.json`
3. Run `pnpm install` from the root

Internal packages skip the catalog and use `"workspace:*"`. `pnpm-workspace.yaml` sets `saveExact` and `engineStrict`. The repo has no `.npmrc`: since pnpm 11 it is read for registry and auth only, so a setting added there is silently ignored — put pnpm settings in `pnpm-workspace.yaml`. `engineStrict` checks dependencies' `engines` against `nodeVersion`; it does not stop a workspace running on the wrong Node. `devEngines.runtime` in the root `package.json` is what pins Node: pnpm downloads 26.13.0 and runs every script with it, whatever `node -v` says. Keep `engines.node` in every workspace `package.json` anyway: `eslint-plugin-n` reads it from the nearest `package.json` to decide which Node APIs are allowed, and without it falls back to `>=16.0.0` and fails lint on anything newer (`import.meta.dirname` in `e2e/support/environment.ts` is the first to break). A pre-commit hook (`scripts/check-lockfile.sh`) verifies the lockfile is in sync.

## Critical Rules

**Review** — after changing code, spawn the `ocr-reviewer` subagent (`.claude/agents/ocr-reviewer.md`), which runs OCR delegate review with a clean context and reports only; verify its High/Medium findings and fix the real ones. The `Stop` hook in `.claude/settings.json` (`.claude/hooks/ocr-review-gate.sh`) blocks finishing a turn while the non-Markdown diff differs from the one last reviewed. The diff is hashed when the reviewer starts (`.git/ocr-reviewed.pending.<agent_id>`) and promoted to `.git/ocr-reviewed` only if the reviewer's final message starts with its `## OCR review -` header, so edits made during the review and failed runs both stay unreviewed.

**Imports** — absolute imports via the `src/*` alias; `@workspace/*` for internal packages; no deep relative paths (`../../../`).

**Type safety** — no `any` (use `unknown`); explicit return types everywhere; no `as` assertions unless unavoidable.

**Validation** — every Zod schema lives in `packages/shared/src/schemas/`; validate at both the route level (middleware) and the model level (before DB writes). An `UPDATE_*_SCHEMA` is an explicit allowlist without defaults, never `COLLECTION_SCHEMA.partial()`; route ids are validated too. Details in `apps/server/CLAUDE.md`.

**Dead code** — knip runs on pre-commit and in CI. An exported symbol nobody imports, or a dependency nobody uses, will fail the build; delete it or wire it up rather than leaving it dangling.

**Security** — never expose password, tokens, or secrets in responses or logs; never bypass permission checks; always use env variables for secrets.

## Environment Variables

Copy the `.env.example` in both `apps/server/` and `apps/client/` to `.env`. Both apps validate env with Zod at startup (`apps/server/src/config/environment.ts`, `apps/client/src/config/env.ts`) and **throw on the first invalid or missing variable** — add any new variable to the schema and to `.env.example` together. A new server variable also needs adding to `infra/apps/trellify/base/config-server.env` or SealedSecrets.

## Git Conventions

Conventional Commits (`feat(scope): description`), enforced by commitlint on `commit-msg`. Hooks are managed by **lefthook** (`lefthook.yaml`) — pre-commit runs gitleaks on the staged diff, lockfile check, CSP hash check, knip, prettier, and `lint:fix`. The gitleaks hook needs the binary on `PATH` (`winget install Gitleaks.Gitleaks`); `.gitleaks.toml` allowlists only SealedSecret ciphertext and the public SonarCloud project key - a real hit means rotate the secret, never allowlist it. Branch naming: `feature/*`, `bugfix/*`, `hotfix/*` off `main`. Releases are automated by release-please.

## Further Reading

- `README.md` — setup, feature list, Postman usage, git workflow
- `infra/README.md` — cluster architecture, ArgoCD, secrets, backups, common kubectl operations
- `k6/README.md` — load-test scenarios, profiles, thresholds, Prometheus integration
