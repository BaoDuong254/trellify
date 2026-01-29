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
COPY packages/eslint/package.json ./packages/eslint/
COPY packages/typescript/package.json ./packages/typescript/
COPY apps/server/package.json ./apps/server/

# Copy TypeScript configs from packages
COPY packages/typescript ./packages/typescript

# Install dependencies for entire workspace
# Use --ignore-scripts to skip prepare hooks (lefthook needs git)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy shared packages source code
COPY packages/shared ./packages/shared

# Build shared packages first
RUN pnpm --filter=@workspace/shared run pkg:build || echo "No build script for shared"

# Copy server app configuration files
COPY apps/server/tsconfig*.json ./apps/server/
COPY apps/server/nodemon.json ./apps/server/

# Copy server app source code
COPY apps/server/src ./apps/server/src

# Build the server application
WORKDIR /workspace/apps/server
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm run apps:build

# Production stage
FROM node:24-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Set workdir to match workspace structure for proper module resolution
WORKDIR /workspace/apps/server

# Copy built application from builder stage
COPY --from=builder /workspace/apps/server/dist ./dist
COPY --from=builder /workspace/apps/server/package.json ./package.json

# Copy node_modules from workspace root (includes all dependencies and @workspace packages)
COPY --from=builder /workspace/node_modules /workspace/node_modules

# Copy shared package if it has a dist folder
COPY --from=builder /workspace/packages/shared /workspace/packages/shared

# Expose port 3000 for Express server
EXPOSE 3000

# Start the server with NODE_PATH to ensure module resolution
ENV NODE_PATH=/workspace/node_modules
CMD ["node", "dist/index.js"]
