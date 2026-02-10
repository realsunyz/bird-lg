# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bird-lg-client .

# Production stage
FROM alpine:3.23

# Install traceroute
RUN apk add --no-cache traceroute ca-certificates

WORKDIR /app

# Copy binary
COPY --from=builder /app/bird-lg-client .

# Default port
EXPOSE 8000

# Run
ENTRYPOINT ["/app/bird-lg-client"]
CMD ["--listen=:8000"]
