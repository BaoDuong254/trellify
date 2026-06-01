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
```

**Client (.env in `apps/client/`):**

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api/v1
```

## 🏃‍♂️ Running the Project

### Development mode

The project uses Turbo for monorepo management. Run both client and server simultaneously:

```bash
# From root directory - runs both client and server in parallel
pnpm start:dev
```

Or run them separately:

```bash
# Terminal 1 - Run server only
cd apps/server
pnpm start:dev

# Terminal 2 - Run client only
cd apps/client
pnpm start:dev
```

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

The project has built-in git hooks to ensure code quality:

- **pre-commit**: Run lint and format code
- **commit-msg**: Check commit message format

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
