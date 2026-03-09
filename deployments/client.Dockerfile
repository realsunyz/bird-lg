# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app/apps/client

COPY apps/client/go.mod apps/client/go.sum ./

RUN go mod download

COPY apps/client/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bird-lg-client .

# Production stage
FROM alpine:3.23

RUN apk add --no-cache traceroute ca-certificates

WORKDIR /app

COPY --from=builder /app/apps/client/bird-lg-client ./

EXPOSE 8000

ENTRYPOINT ["/app/bird-lg-client"]
CMD ["--listen=:8000"]
