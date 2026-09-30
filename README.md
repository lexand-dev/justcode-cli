# JustCode

A Bun workspace with a small Hono HTTP server and an OpenTUI welcome screen built with React.

The runnable projects live in `apps/server` and `apps/cli`. The root `package.json` uses `apps/*` to include both as Bun workspaces.

## Setup

```sh
bun install
cp -n apps/server/.env.example apps/server/.env
cp -n apps/cli/.env.example apps/cli/.env
```

Set `DEEPSEEK_API_KEY` in `apps/server/.env`. Each app loads its own `.env` file automatically through Bun.

## Run

```sh
bun run dev:server    # Hono server at http://localhost:3000
bun run start:cli     # interactive terminal welcome screen
```

The server listens on the `PORT` in `apps/server/.env`, and the CLI connects to the `PORT` in `apps/cli/.env`. Both default to `3000`; keep the values the same when changing ports.

The server responds at `/` and `/health`. Press `Ctrl+C` to leave the CLI. Run `bun run typecheck` to check both workspaces.
