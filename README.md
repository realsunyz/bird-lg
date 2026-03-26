# BIRD Looking Glass

![bird-lg](https://socialify.git.ci/realSunyz/bird-lg/image?custom_language=Go&font=Source+Code+Pro&language=1&name=1&owner=1&pattern=Circuit+Board&theme=Auto)

This project is still in active development and may have breaking changes.

## Repository Layout

- `apps/server`: central Fiber server entrypoint
- `apps/client`: remote probing client (separate Go module)
- `apps/web`: Vite + React frontend
- `internal/server`: server-only packages grouped by bootstrap/http/platform/services
- `deployments`: Dockerfiles and example config
- `schemas`: wire-contract reference docs

## Build Commands

- Server: `env GOCACHE=/tmp/go-build-server go test ./...`
- Client: `cd apps/client && env GOCACHE=/tmp/go-build-client go test ./...`
- Frontend: `pnpm --dir apps/web build`

## IPInfo Lite DB

- Set `IPINFO_TOKEN` to let the server download `ipinfo_lite.mmdb` from ipinfo automatically on first Trace IP info lookup.
- Example source URL: `https://ipinfo.io/data/ipinfo_lite.mmdb?_src=frontend&token=exampletoken`
- If the download fails, the server falls back to any existing local `data/ipinfo.mmdb`.
