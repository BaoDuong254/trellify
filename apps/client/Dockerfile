# Build stage
FROM node:24-alpine AS builder

# Set workdir to monorepo root
WORKDIR /workspace

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy workspace configuration files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy all package.json files for workspace resolution
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint/package.json ./packages/eslint/
COPY packages/typescript/package.json ./packages/typescript/
COPY apps/client/package.json ./apps/client/

# Copy TypeScript configs from packages
COPY packages/typescript ./packages/typescript

# Install dependencies for entire workspace
# Use --ignore-scripts to skip prepare hooks (lefthook needs git)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy shared packages source code
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui

# Build shared packages first
RUN pnpm --filter=@workspace/shared run pkg:build || echo "No build script for shared"
RUN pnpm --filter=@workspace/ui run pkg:build || echo "No build script for ui"

# Copy client app configuration files
COPY apps/client/tsconfig*.json ./apps/client/
COPY apps/client/vite.config.ts ./apps/client/
COPY apps/client/index.html ./apps/client/

# Copy client app source code
COPY apps/client/public ./apps/client/public
COPY apps/client/src ./apps/client/src

# Set environment variables for build
COPY apps/client/.env ./apps/client/.env

# Build the client application
WORKDIR /workspace/apps/client
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm run apps:build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /workspace/apps/client/dist /usr/share/nginx/html

# Expose ports
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
