# pnpm base stage
FROM node:24-alpine AS pnpm-base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Frontend build stage
FROM pnpm-base AS frontend

WORKDIR /app

# Prefetch dependencies from lockfile
COPY pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch --frozen-lockfile

# Install dependencies from local store only
COPY package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --offline

# Build frontend static assets
COPY . .
RUN pnpm build

# Backend build stage
FROM golang:1.25-alpine AS backend

WORKDIR /app

# Copy go mod files
COPY server/go.mod server/go.sum ./

# Download dependencies
RUN go mod download

# Copy source
COPY server/ .

# Build binary
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server .

# Production stage
FROM alpine:3.23

# Runtime packages
RUN apk add --no-cache ca-certificates

WORKDIR /app

# Copy backend binary
COPY --from=backend /app/server ./

# Copy frontend static files
COPY --from=frontend /app/dist ./static

# Default port
EXPOSE 3000

# Runtime defaults
ENV LISTEN_ADDR=":3000"

# Run server
CMD ["./server"]
