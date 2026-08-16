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
> - MongoDB and Redis are **external services** (e.g. MongoDB Atlas and Redis Cloud) - there is no local container for either, so `MONGODB_URI` and `REDIS_URL` must point at real instances before `pnpm start:dev` will boot.

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

Deployment is fully automated by GitHub Actions (`.github/workflows/deploy.yml`).

**1. Trigger** - the workflow runs on `workflow_run` after the **CI** workflow completes successfully on `main`. If CI fails, nothing is built or deployed.

**2. Build & push** - `apps/server/Dockerfile` and `apps/client/Dockerfile` are built and pushed to Docker Hub as `trellify-server:latest` and `trellify-client:latest`, using registry-backed build caching.

**3. Deploy** - the compose files and the generated `.env` files are copied to the host over SCP, then started over SSH:

```bash
# Portainer is brought up first for container management
docker compose -f docker-compose.portainer.yml up -d

# Then the application stack
docker compose pull
docker compose up -d --scale server=3 --scale worker=1 --remove-orphans
```

**Topology** (`docker-compose.yml`):

| Service  | Replicas | Ports                    | Notes                                                      |
| -------- | -------- | ------------------------ | ---------------------------------------------------------- |
| `server` | 3        | `expose 3000` (internal) | Healthcheck on `/api/v1/status`                            |
| `worker` | 1        | none                     | Runs `node dist/worker.js` from the same image as `server` |
| `client` | 1        | `4014:80`                | Starts only once `server` is healthy                       |

Portainer is published on `127.0.0.1:9443` only, so it is reachable through an SSH tunnel rather than the public internet.

> **Note**
> Running **3 server replicas** is why Socket.io is configured with the Redis adapter (`@socket.io/redis-adapter`). A broadcast issued on one replica must reach clients connected to the other two, so real-time code has to be adapter-aware - use `io.in(...).fetchSockets()` rather than assuming a single process.

**Required GitHub secrets:**

| Secret                                            | Purpose                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `DOCKERHUB_USERNAME`, `DOCKERHUB_PASSWORD`        | Docker Hub authentication and image namespace |
| `SERVER_ENV`, `CLIENT_ENV`                        | Full contents of each app's `.env` file       |
| `HOST_VPS`, `USERNAME_VPS`, `KEY_VPS`, `PORT_VPS` | SSH access to the deployment host             |
| `TELEGRAM_TO`, `TELEGRAM_TOKEN`                   | Build and deploy status notifications         |
| `SONAR_TOKEN`                                     | SonarCloud scan in the CI workflow            |

> **Important**
> `SERVER_ENV` and `CLIENT_ENV` hold the entire `.env` file contents and are written to disk by the workflow. When you add a new environment variable, update these secrets as well - otherwise the deployed container fails Zod validation at startup and the stack will not come up.

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
