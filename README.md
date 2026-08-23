# Trellify

A full-stack project management platform with real-time collaboration, drag-and-drop kanban workflows, and team workspace management. Built using React, Express.js, and MongoDB in a scalable monorepo architecture.

## 📋 Table of Contents

- [Trellify](#trellify)
  - [📋 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
    - [Install pnpm](#install-pnpm)
  - [🚀 Project Installation](#-project-installation)
    - [1. Clone repository](#1-clone-repository)
    - [2. Install dependencies](#2-install-dependencies)
    - [3. Adding packages](#3-adding-packages)
    - [4. Environment Configuration](#4-environment-configuration)
  - [🏃‍♂️ Running the Project](#️-running-the-project)
    - [Development mode](#development-mode)
    - [Production build](#production-build)
  - [🚀 Deployment](#-deployment)
    - [Cluster topology](#cluster-topology)
    - [Required GitHub secrets](#required-github-secrets)
    - [Legacy: Docker Compose deployment](#legacy-docker-compose-deployment)
  - [📮 Testing with Postman](#-testing-with-postman)
    - [Setup](#setup)
  - [🔄 Git Workflow](#-git-workflow)
    - [Commit Message Convention](#commit-message-convention)
    - [Hooks](#hooks)
    - [Branch Naming](#branch-naming)
    - [Standard Workflow](#standard-workflow)

## ✨ Features

- 📋 **Kanban Boards** - Create and manage multiple boards with customizable columns
- 🃏 **Card Management** - Drag-and-drop cards between columns with smooth animations
- 👥 **Team Collaboration** - Invite members to boards and assign cards to team members
- 💬 **Real-time Updates** - Socket.io for live synchronization across all users
- 🔐 **Authentication & Authorization** - JWT-based auth with secure user management
- 🔑 **Password Reset** - Email-based forgot-password and reset flow
- 🛡️ **Bot Protection** - Cloudflare Turnstile on register, login, and forgot-password
- 🖼️ **Avatar Uploads** - Cloudinary-backed profile image uploads
- ⚙️ **Background Jobs** - BullMQ worker for deferred tasks (e.g. unverified-account cleanup)
- 🎨 **Theme Support** - Light and dark mode with customizable themes
- 🔔 **Notifications** - Real-time notifications for board activities and invitations

### Install pnpm

If you don't have pnpm installed, you can install it using one of the following methods:

**Using npm:**

```bash
npm install -g pnpm
```

For more installation options, visit [pnpm installation guide](https://pnpm.io/installation).

## 🚀 Project Installation

### 1. Clone repository

```bash
git clone https://github.com/BaoDuong254/trellify.git
cd trellify
```

### 2. Install dependencies

The project uses pnpm workspaces. Simply run from the root directory:

```bash
pnpm install
```

This will install all dependencies for root, apps (client & server), and packages automatically.

### 3. Adding packages

This project uses **pnpm catalog** to manage all dependency versions centrally in `pnpm-workspace.yaml`. Individual `package.json` files reference packages with `"catalog:"` instead of a version number - never pin versions directly in `package.json`.

**Step 1 - Register the version in `pnpm-workspace.yaml`:**

```yaml
catalog:
  # ... existing entries ...
  <package-name>: <version> # e.g. dayjs: 1.11.13
```

**Step 2 - Add the dependency to the target workspace's `package.json`:**

```json
{
  "dependencies": {
    "<package-name>": "catalog:"
  }
}
```

Use `"devDependencies"` instead for build-time / tooling packages.

**Step 3 - Sync the lockfile from the root:**

```bash
pnpm install
```

**Adding an internal workspace package** (e.g. `@workspace/shared`, `@workspace/ui`) — these are resolved locally, so they do not need a catalog entry. Just reference them directly in `package.json`:

```json
{
  "dependencies": {
    "@workspace/shared": "workspace:*",
    "@workspace/ui": "workspace:*"
  }
}
```

Then run `pnpm install` from the root.

### 4. Environment Configuration

Create `.env` files for both client and server:

**Server (.env in `apps/server/`):**

```env
# Server configuration
PORT=3000
NODE_ENV=development

# Client configuration
CLIENT_URL=http://localhost:5173

# Database configuration
MONGODB_URI=your_mongodb_uri
DATABASE_NAME=your_database_name

# Brevo configuration
BREVO_API_KEY=your_brevo_api_key

# Admin configuration
ADMIN_EMAIL_ADDRESS=your_admin_email
ADMIN_EMAIL_NAME=your_admin_name

# JWT configuration
ACCESS_TOKEN_SECRET_SIGNATURE=your_access_token_secret
ACCESS_TOKEN_LIFE=your_access_token_life
REFRESH_TOKEN_SECRET_SIGNATURE=your_refresh_token_secret
REFRESH_TOKEN_LIFE=your_refresh_token_life

# Cookie configuration
COOKIE_MAX_AGE=your_cookie_max_age

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Redis cloud configuration
REDIS_URL=your_redis_url

# BullMQ configuration
QUEUE_PREFIX=trellify
WORKER_CONCURRENCY=5

# Turnstile configuration, use 1x0000000000000000000000000000000AA for dev mode
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

**Client (.env in `apps/client/`):**

```env
# API Configuration - server origin only, the client appends /api/v1 itself
VITE_API_ENDPOINT=http://localhost:3000

# Turnstile Site Key, use 1x00000000000000000000AA for dev mode
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

> **Note**
>
> - Both apps validate their environment with Zod at startup (`apps/server/src/config/environment.ts`, `apps/client/src/config/env.ts`) and **throw on the first missing or invalid variable** - a typo fails fast at boot instead of surfacing later as a broken request.
> - `VITE_API_ENDPOINT` must be the server **origin only**. Every API call already appends `/api/v1/...`, so adding the path here produces `/api/v1/api/v1/...`.
> - **For local development**, MongoDB and Redis are **external services** (e.g. MongoDB Atlas and Redis Cloud) - there is no local container for either, so `MONGODB_URI` and `REDIS_URL` must point at real instances before `pnpm start:dev` will boot. Production is different: both run in-cluster as StatefulSets, and the connection details come from the manifests in [`infra/`](infra/README.md), not from these files.

## 🏃‍♂️ Running the Project

### Development mode

The project uses Turbo for monorepo management. A single command starts **three** processes - the client, the API server, and the BullMQ worker:

```bash
# From root directory - runs client (5173), API server (3000) and worker in parallel
pnpm start:dev
```

Or run a single workspace. From the root directory, `fe` and `be` are aliases for `pnpm --filter=client` and `pnpm --filter=server`, so there is no need to change directory:

```bash
# Terminal 1 - Client only
pnpm fe start:dev

# Terminal 2 - API server only (does NOT start the worker)
pnpm be start:dev

# Terminal 3 - BullMQ worker only
pnpm be start:worker:dev

# API server with the Node inspector attached on port 9229
pnpm be start:debug
```

> **Note**
> The worker is a separate process from the API server (`apps/server/src/worker.ts`). If you start only `pnpm be start:dev`, the API still enqueues jobs but nothing consumes them - queued work such as unverified-account cleanup will silently never run.

### Production build

The project uses a monorepo structure with shared packages. You must build in the correct order:

```bash
# Step 1: Build shared packages first (required dependencies for apps)
pnpm pkg:build

# Step 2: Build applications (client & server)
pnpm apps:build

# Step 3: Run production
pnpm start:prod
```

## 🚀 Deployment

Production runs on a self-hosted **k3s** cluster and is deployed by **GitOps** — GitHub Actions builds images, commits the new tag back to this repo, and ArgoCD reconciles the cluster to match. Nothing is deployed by SSH-ing into a machine.

**1. Build** — a push to `main` triggers [`.github/workflows/build-k8s-images.yml`](.github/workflows/build-k8s-images.yml), which builds `apps/server/Dockerfile` and `apps/client/Dockerfile` and pushes them to GHCR as `ghcr.io/baoduong254/trellify-{server,client}`.

**2. Tag** — each image gets the immutable tag `sha-<short-commit>` alongside `latest`. Only the `sha-` tag is ever deployed, so whatever is running traces back to exactly one commit.

**3. Bump** — the `bump-manifest` job runs `kustomize edit set image` against `infra/trellify/overlays/prod` and commits the result as `chore(deploy): trellify -> sha-xxxxxxx [skip ci]`. The `[skip ci]` marker is what stops the workflow from re-triggering itself.

**4. Sync** — ArgoCD sees the new commit and rolls the Deployments forward. CI runs in parallel with the build rather than gating it; the Docker build itself runs `pnpm apps:build`, so code that does not compile never produces an image.

See [`infra/README.md`](infra/README.md) for the full infrastructure reference — cluster bootstrap, ArgoCD project layout, SealedSecrets, and the operations runbook.

### Cluster topology

| Workload           | Replicas        | Notes                                                                    |
| ------------------ | --------------- | ------------------------------------------------------------------------ |
| `trellify-server`  | 3, HPA up to 6  | Autoscales at 70% CPU; PodDisruptionBudget keeps `minAvailable: 2`       |
| `trellify-worker`  | 1               | Same image as the server, running `dist/worker.js` - the BullMQ consumer |
| `trellify-client`  | 2               | nginx serving the built Vite bundle                                      |
| `trellify-mongodb` | 1 (StatefulSet) | In-cluster, 20Gi retained volume, nightly backup CronJob                 |
| `trellify-redis`   | 1 (StatefulSet) | In-cluster, 8Gi retained volume                                          |

All three public paths share one host: `/` goes to the client, `/api` to the server (rate limited), and `/socket.io` to the server with long timeouts and cookie affinity. There is no public port on the VM — traffic arrives through an outbound-only Cloudflare tunnel.

### Required GitHub secrets

| Secret / variable               | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `GITHUB_TOKEN` (built in)       | Pushes images to GHCR                           |
| `GITOPS_TOKEN`                  | Pushes the image-tag bump commit back to `main` |
| `SERVER_ENV`, `CLIENT_ENV`      | Full `.env` contents, used by the CI build only |
| `vars.VITE_TURNSTILE_SITE_KEY`  | Baked into the client image at build time       |
| `TELEGRAM_TO`, `TELEGRAM_TOKEN` | Build success / failure notifications           |
| `SONAR_TOKEN`                   | SonarCloud scan in the CI workflow              |

> **Important**
> Runtime configuration for the cluster does **not** come from these secrets — it comes from `infra/trellify/base/configmap-server.yaml` and the SealedSecrets in `infra/trellify/overlays/prod/`. When you add a new environment variable, update those as well, or the pod fails Zod validation at startup and never becomes ready.

### Legacy: Docker Compose deployment

Before the k3s migration, production ran as a Docker Compose stack on a single VPS, deployed over SSH by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) with images on Docker Hub and Portainer for container management. Those files are still in the repo: [`docker-compose.yml`](docker-compose.yml) and [`docker-compose.portainer.yml`](docker-compose.portainer.yml), and remain useful for self-hosting on a single machine.

**This path is no longer used for production.** `deploy.yml` is `workflow_dispatch`-only and its job guard (`github.event.workflow_run.conclusion`) never evaluates true on a manual dispatch, so the workflow is effectively inert. It is kept for reference rather than maintained.

It required its own secrets, none of which the k3s pipeline uses:

| Secret                                            | Purpose                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_PASSWORD`        | Docker Hub authentication and image namespace |
| `HOST_VPS`, `USERNAME_VPS`, `KEY_VPS`, `PORT_VPS` | SSH access to the deployment host             |

## 📮 Testing with Postman

The project includes a Postman collection with pre-configured requests.

### Setup

1. **Import Collection**
   - Open Postman
   - Click **Import**
   - Select `postman/collections/Trellify.postman_collection.json`

2. **Import Environment**
   - Click **Import**
   - Select `postman/environments/Trellify.postman_environment.json`

3. **Configure Environment**
   - Select "Trellify" environment in Postman
   - Update variables if needed:
     - `host`: `http://localhost:3000`

## 🔄 Git Workflow

### Commit Message Convention

The project uses [Conventional Commits](https://www.conventionalcommits.org/):

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Formatting changes that don't affect code logic
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or fixing tests
- `chore`: Build tasks, package manager configs, etc.

**Examples:**

```bash
git commit -m "feat(auth): add user login functionality"
git commit -m "fix(api): resolve user data fetching issue"
git commit -m "docs: update installation guide"
git commit -m "style(client): format code with prettier"
```

### Hooks

Git hooks are managed by [lefthook](https://github.com/evilmartians/lefthook) and configured in `lefthook.yaml`. They are installed automatically by the `prepare` script on `pnpm install`:

- **pre-commit**:
  1. Verify `pnpm-lock.yaml` is in sync (`scripts/check-lockfile.sh`)
  2. Run `knip` to detect unused files, exports, and dependencies
  3. Format staged files with Prettier
  4. Run `pnpm lint:fix`
- **commit-msg**: Validate the message against Conventional Commits via commitlint
- **post-commit**: Print a success message

> **Note**
> `knip` also runs in CI (both `knip` and `knip:production`). An exported symbol nobody imports, or a dependency nobody uses, will fail the build - delete it or wire it up rather than leaving it dangling.

### Branch Naming

- `main`: Production branch
- `feature/feature-name`: For new features
- `bugfix/bug-description`: For bug fixes
- `hotfix/issue-description`: For urgent production issues

### Standard Workflow

1. **Create a new branch**
   Always branch off from the latest version of `main`.

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Work on your feature**
   Make your code changes and commit them using the [Conventional Commits](https://www.conventionalcommits.org/) format:

   ```bash
   git add .
   git commit -m "feat(auth): add login functionality"
   ```

3. **Rebase with the latest main branch**
   Before pushing, make sure your branch is up to date with `main`:

   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push your branch to remote**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request (PR)**
   Open a PR to merge your branch into `main` using the project’s PR template.
   Wait for review and approval before merging.

6. **After Merge — Sync and Clean Up**
   Once your PR is merged:

   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/your-feature-name     # delete local branch
   git push origin --delete feature/your-feature-name   # delete remote branch
   ```
