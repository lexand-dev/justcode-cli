# JustCode

A coding agent in your terminal: a Hono server talks to the model, and an OpenTUI (React) client runs the agent's tools in the directory you launch it from.

It is a Bun workspace. The runnable projects are `apps/server` and `apps/cli`; `packages/` holds the agent's tools (`tools`), the Prisma schema and client (`db`), and shared code (`shared`).

## Setup

```sh
bun install
cp -n apps/server/.env.example apps/server/.env
cp -n apps/cli/.env.example apps/cli/.env
cp -n packages/db/.env.example packages/db/.env
docker compose up -d   # local Postgres
bun run db:push        # create the tables
```

Set `DEEPSEEK_API_KEY` in `apps/server/.env`. Each app loads its own `.env` file automatically through Bun. The example `DATABASE_URL`s match `docker-compose.yml`.

## Run

```sh
bun run dev:server    # Hono server at http://localhost:3000
bun run start:cli     # terminal chat with the agent
```

The server listens on the `PORT` in `apps/server/.env`, and the CLI connects to the `PORT` in `apps/cli/.env`. Both default to `3000`; keep the values the same when changing ports.

The server exposes `POST /sessions`, `GET /sessions/:sessionId/messages`, `POST /chat/:sessionId`, and `GET /health` (used by the CLI's server-status indicator).

## Coding agent

JustCode works on the directory the CLI is launched from. The model can read, write, edit, list, and search files, and run shell commands with `bash`; the full list is `agentTools` in `packages/tools/src/index.ts`. The server only forwards these tool calls; the CLI runs them locally. Every file path is confined to the launch directory (paths outside it, including through symlinks, are rejected). Shell commands cannot be confined that way, so the CLI asks before running each one: press `y` to run it, `a` to stop asking for the rest of the session, or `n`/`Esc` to deny it. Commands run non-interactively in the launch directory, with a timeout and trimmed output (the limits are in `packages/tools/src/tools/shell/bash.ts`).

The tools live in `packages/tools/src/tools/<group>/` (`filesystem/`, `shell/`), one file per tool, with shared infrastructure in `src/core/`. To add a tool, create its file in the matching group, then register it in `src/index.ts` and `src/execute.ts`. Press `Ctrl+C` to leave the CLI. Run `bun run typecheck` to check every workspace.

## Server routes

Keep route groups flat in `apps/server/src/routes/`, one file per group. Each file exports a chained `Hono` app with paths relative to its mount point (`/` for the group root). `apps/server/src/app.ts` mounts the groups and exports `AppType` for the typed CLI client.

For example, to add a `/projects` group, create `apps/server/src/routes/projects.ts`:

```ts
import { Hono } from "hono";

export const projectRoutes = new Hono()
  .get("/", (c) => c.json({ projects: [] }));
```

Then mount it in `apps/server/src/app.ts` with `.route("/projects", projectRoutes)`. Further routes in the same group can be chained in `projects.ts`, such as `.get("/:id", ...)`. Validate request bodies with `zValidator("json", schema)` before using `c.req.valid("json")`.
