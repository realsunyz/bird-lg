# pnpm base stage
FROM node:24-alpine AS pnpm-base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@latest --activate

# Frontend build stage
FROM pnpm-base AS frontend

WORKDIR /app/apps/web

ARG APP_VERSION=dev
ARG APP_BUILD=
ENV APP_VERSION=$APP_VERSION
ENV APP_BUILD=$APP_BUILD

COPY apps/web/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch --frozen-lockfile

COPY apps/web/package.json ./package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --offline

COPY apps/web/ ./
RUN pnpm build

# Backend build stage
FROM golang:1.25-alpine AS backend

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY apps/server ./apps/server
COPY internal ./internal

RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./apps/server

# Production stage
FROM alpine:3.23

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=backend /app/server ./
COPY --from=frontend /app/apps/web/dist ./static

EXPOSE 3000

ENV LISTEN_ADDR=":3000"

CMD ["./server"]
