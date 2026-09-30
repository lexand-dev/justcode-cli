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

The server exposes `POST /chat` and `GET /health` (used by the CLI's server-status indicator). Press `Ctrl+C` to leave the CLI. Run `bun run typecheck` to check both workspaces.

## Server routes

Keep route groups flat in `apps/server/src/routes/`, one file per group. Each file exports a chained `Hono` app with paths relative to its mount point (`/` for the group root). `apps/server/src/app.ts` mounts the groups and exports `AppType` for the typed CLI client.

For example, to add a `/projects` group, create `apps/server/src/routes/projects.ts`:

```ts
import { Hono } from "hono";

export const projectRoutes = new Hono()
  .get("/", (c) => c.json({ projects: [] }));
```

Then mount it in `apps/server/src/app.ts` with `.route("/projects", projectRoutes)`. Further routes in the same group can be chained in `projects.ts`, such as `.get("/:id", ...)`. Validate request bodies with `zValidator("json", schema)` before using `c.req.valid("json")`.
