FROM node:22-alpine AS frontend

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM golang:1.25-alpine AS backend

WORKDIR /app
COPY server/ ./
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=backend /app/server ./

COPY --from=frontend /app/out ./static

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

ENV LISTEN_ADDR=":3000"
ENV STATIC_DIR="./static"

CMD ["./server"]
