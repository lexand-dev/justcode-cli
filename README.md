# JustCode

A Bun workspace with a small Hono HTTP server and an OpenTUI welcome screen built with React.

The runnable projects live in `apps/server` and `apps/cli`. The root `package.json` uses `apps/*` to include both as Bun workspaces.

## Setup

```sh
bun install
```

## Run

```sh
bun run dev:server    # Hono server at http://localhost:3000
bun run start:cli     # interactive terminal welcome screen
```

The server and CLI use the same `PORT` setting (default `3000`). Export it in the shell before starting both:

```sh
export PORT=4000
bun run dev:server

# In another terminal:
export PORT=4000
bun run start:cli
```

The server responds at `/` and `/health`. Press `Ctrl+C` to leave the CLI. Run `bun run typecheck` to check both workspaces.
