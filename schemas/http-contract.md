# HTTP Contract

These interfaces are intentionally unchanged by the `apps/*` refactor.

## Server API
- `GET /api/config`
- `GET /api/auth`
- `GET /api/health`
- `POST /api/verify`
- `POST /api/bird`
- `POST /api/tool/ping`
- `POST /api/tool/ping/stream`
- `POST /api/tool/traceroute`
- `POST /api/tool/traceroute/stream`
- `GET /api/auth/login`
- `GET /api/auth/logout`
- `GET /auth/callback`

## Frontend Routes
- `/`
- `/detail/:serverId`

## Client API
- `POST /api/tool/ping`
- `POST /api/tool/ping/stream`
- `POST /api/tool/traceroute`
- `POST /api/tool/traceroute/stream`
- `POST /api/tool/bird`
- `GET /api/health`

## Client CLI Flags
- `--listen`
- `--bird`
- `--secret`
- `--origins`
- `--ratelimit`
