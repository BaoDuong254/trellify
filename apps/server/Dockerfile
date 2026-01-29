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

# Install wget for healthcheck and pnpm
RUN apk add --no-cache wget && \
    corepack enable && \
    corepack prepare pnpm@10.28.2 --activate

# Set workdir to monorepo root for proper workspace resolution
WORKDIR /workspace

# Copy workspace configuration files (including catalog definitions)
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy all package.json files for workspace resolution
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/
COPY --from=builder /workspace/packages/eslint/package.json ./packages/eslint/
COPY --from=builder /workspace/packages/typescript/package.json ./packages/typescript/
COPY --from=builder /workspace/apps/server/package.json ./apps/server/

# Copy built shared packages
COPY --from=builder /workspace/packages/shared ./packages/shared

# Copy built server application
COPY --from=builder /workspace/apps/server/dist ./apps/server/dist

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Set working directory to server app
WORKDIR /workspace/apps/server

# Expose port 3000 for Express server
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
