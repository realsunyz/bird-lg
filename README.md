# BIRD Looking Glass

A web-based BIRD routing daemon looking glass with Next.js frontend and Go client.

## Architecture

```
Browser → Next.js (API Routes) → Client (Go) → BIRD Socket
              ↓
       Turnstile验证
       HMAC签名
```

## Quick Start

```bash
# Frontend (Next.js)
cd frontend
pnpm install
pnpm dev

# Client (Go) - on each router
cd client
go build -o bird-lg-client .
./bird-lg-client --secret=your-shared-secret
```

---

## Frontend (Next.js)

TypeScript + Tailwind + daisyUI.

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

### Environment Variables

| Variable               | Description                        |
| ---------------------- | ---------------------------------- |
| `TURNSTILE_SITE_KEY`   | Cloudflare Turnstile site key      |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key    |
| `HMAC_SECRET`          | Shared secret for signing requests |
| `SERVERS`              | JSON array of servers              |
| `APP_TITLE`            | App title                          |
| `APP_SUBTITLE`         | App subtitle                       |

Example:

```bash
export SERVERS='[{"id":"tokyo","name":"Tokyo","location":"Tokyo, JP","endpoint":"http://router:8000"}]'
export HMAC_SECRET="your-shared-secret"
pnpm start
```

---

## Client (Go)

Runs on each router with BIRD.

### Options

| Flag       | Default              | Description        |
| ---------- | -------------------- | ------------------ |
| `--listen` | `:8000`              | Listen address     |
| `--bird`   | `/run/bird/bird.ctl` | BIRD socket path   |
| `--secret` | -                    | HMAC shared secret |

## License

MIT
