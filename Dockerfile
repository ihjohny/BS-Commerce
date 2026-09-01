FROM node:24-alpine AS base

WORKDIR /app

# Install dependencies required for sharp and native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Enable Corepack for Yarn
RUN corepack enable

# Copy workspace package manifests
COPY package.json yarn.lock tsconfig.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN yarn install

# Copy source files
COPY packages ./packages
COPY scripts ./scripts
COPY data ./data

# Expose Next.js / Payload port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["yarn", "dev"]
