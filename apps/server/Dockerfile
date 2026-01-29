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
RUN pnpm install --frozen-lockfile

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

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copy package.json for production dependencies
COPY apps/server/package.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /workspace/apps/server/dist ./dist

# Copy shared package if needed at runtime (usually bundled in dist)
# If @workspace/shared is external dependency, copy from builder:
COPY --from=builder /workspace/packages/shared/dist ./node_modules/@workspace/shared

# Expose port 3000 for Express server
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
