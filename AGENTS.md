# Repository notes

## Workspace

- Bun workspace: `apps/server` (Hono API), `apps/cli` (OpenTUI terminal client), `packages/tools` (the agent's tools), `packages/db` (Prisma schema and client), `packages/shared`. Run commands from the repository root; the scripts are in the root `package.json`.
- `bun run typecheck` is the only repository-wide check: there are no test or lint scripts. For one project: `bun run tsc --noEmit -p apps/<name>/tsconfig.json`.
- Name source files in kebab-case (`home-screen.tsx`), even when they export PascalCase components.
- Validate data from every external or untyped boundary with Zod before using it, on the client too (router location state, storage, network responses). Use `safeParse` when invalid or absent data needs a fallback; a TypeScript `as` is not validation. Preserve user input as typed (no trimming).
- Each value lives in one place, the code. Point to the file that owns a constant (`see tools/shell/bash.ts`) rather than copying its value into documentation.

## Server (`apps/server`)

- `src/index.ts` exports Bun's server config (`fetch: app.fetch`); the Hono app is `src/app.ts`. `dev:server` hot-reloads, `start:server` does not.
- One file per route group in `src/routes/`, flat. Each exports a chained `Hono` app with paths relative to its mount point (`"/"` for the group root). `app.ts` only mounts groups (`.route("/chat", chatRoutes)`) and exports `AppType`, which the CLI's Hono RPC client uses for route types; handlers live in the route files.
- The agent (provider, model, system prompt, `ToolLoopAgent`) lives in `src/agent/`; routes run `codingAgent` (`src/agent/coding-agent.ts`) and never configure the model. It stays server-only: the CLI must not import it, so shared types such as `ChatUIMessage` stay in `@justcode/tools`. Move it to its own package only when a second app needs to run the agent.
- Validate bodies with `zValidator("json", schema)` and read them through `c.req.valid("json")`; `c.req.json<T>()` only asserts a type. For AI SDK messages, Zod checks the envelope and `safeValidateUIMessages` checks the parts before `convertToModelMessages`; invalid input is a 400.
- To exercise routes without a server, call `app.request()` from `src/app.ts` with `bun -e`, run from `apps/server` so its `.env` loads. The Hono CLI (`hono request`) cannot load this app: it runs under Node, which cannot resolve the TypeScript `@justcode/db` package.

## Chat protocol

The server owns the history; the client sends only its newest message. `src/routes/chat.ts` and `src/chat-store.ts` hold the rules and their status codes; the invariants:

- Sessions are created by the server (`POST /sessions`) and are anonymous. Session ids come only from the URL.
- `POST /chat/:sessionId` runs one assistant step. A `user` message starts a turn. An `assistant` message is a tool-result continuation of the latest stored message and keeps its id, so one turn is one stored assistant message.
- A retry resends an already stored user message; the server cuts the history at it instead of duplicating it.
- Assistant ids come from `generateMessageId`, so the stored id matches the streamed one.
- `saveChat` (in `onEnd`) makes the stored messages match the final list. Errors are not persisted: when the step does not complete, only the incoming messages are saved. A failed save is logged and leaves the response untouched.

## Tools (`packages/tools`)

- The server sends only the tool definitions (`agentTools` in `src/index.ts`, which have no `execute`) to the model; the CLI runs each call locally with `executeToolCall` from `@justcode/tools/execute`.
- Each tool is one kebab-case file in `src/tools/<group>/` that exports its `tool()` definition and a module implementing `ToolModule` (`src/execute.ts`; its doc comments are the contract). Shared infrastructure is in `src/core/`; a group's private helpers sit in its folder.
- To add a tool: create its file in the matching group (or a new group), then register its definition in `agentTools` and its module in `toolModules`. Typecheck fails if either is missing.
- Tool-specific behavior (approval prompt, result summary, failure detection) belongs in the tool's module. The CLI asks the module and never checks a tool by name.
- Tools report failure by throwing an `Error` whose message is written for the model; the CLI sends it as an `output-error`.

### Workspace guardrail

- Route every filesystem path through `workspace.resolve` (`src/core/workspace.ts`): it resolves symlinks and rejects anything outside the root. The root is the CLI's launch directory (`apps/cli/src/lib/workspace.ts`), with no setting to change it. Listing and search use `walkFiles` (`src/core/walk.ts`).
- `bash` is the one tool the workspace cannot confine (only its `workdir` is resolved), so it defines `describeApproval` and the user approves each call. Any new tool that can act outside the workspace must define `describeApproval` too.
- A denial reaches the model as an `output-error` built by `toolDeniedError` (`apps/cli/src/lib/tool-approval.ts`), because the AI SDK's `output-denied` state is only for server-run tools. Stored sessions keep that error text: changing it makes old denials show as failures.

## Database (`packages/db`)

- Prisma 7, without migration files yet: the schema is applied with `prisma db push`. Before the first shared or deployed database, create a baseline migration (`prisma migrate dev --name init` against an empty database) and use migrations from then on.
- Two entry points: `@justcode/db` exports only the generated model types, so any app, including the CLI, can `import type` them; `@justcode/db/client` exports the `prisma` client and is server-only.
- Each `Message` row is one AI SDK `UIMessage`, its `parts` stored as JSONB and ordered by `position`. Validate loaded messages with `safeValidateUIMessages` and `tools: agentTools`, on the server and in the CLI: without `tools`, the SDK skips tool inputs and outputs entirely.
- Setup: `docker compose up -d` starts Postgres; set `DATABASE_URL` in both `packages/db/.env` (Prisma CLI) and `apps/server/.env` (server), following the `.env.example` files. The generated client (`packages/db/generated/`) is gitignored and created by `bun install` or `bun run db:generate`.
- Schema changes: edit `packages/db/prisma/schema.prisma`, then `bun run db:push`, which also regenerates the client (Prisma 7 does not regenerate on push). A change that drops data needs `bunx prisma db push --accept-data-loss` from `packages/db`; a renamed field is applied as a drop plus an add.
- `bun run db:reset` wipes all data and recreates the tables without asking. `prisma migrate reset` does not apply, since there are no migrations.

## CLI (`apps/cli`)

- An OpenTUI React terminal UI, not browser DOM (`jsxImportSource: "@opentui/react"`). For OpenTUI work, invoke the `opentui` skill first and use its React and task references; check `node_modules` only for what the skill does not cover.
- OpenTUI's `<textarea>` is imperative: no `value`/`onChange`, and neither `onSubmit` nor `onContentChange` provides the text. Keep a `TextareaRenderable` ref and read `ref.current.plainText` on submit; use React state only for derived UI such as its height.
- Screens in `src/screens/`, components in `src/components/`, stateful hooks in `src/hooks/`; `src/index.tsx` only sets up the renderer and mounts the router.
- Flow: the home screen creates a session and navigates to `/sessions/:sessionId` with the prompt in location state; the chat screen hydrates `useChat` from the stored messages, then sends the prompt. `use-agent-chat.ts` runs tool calls (asking first when `describeToolApproval` returns a prompt) and resends the assistant message once every output is in, up to `MAX_TOOL_CALLS_PER_TURN` calls per turn.
- The workspace is the directory the CLI starts in. `bun run start:cli` starts in `apps/cli`, so that is the workspace in development; to work on another directory, run `bun <repo>/apps/cli/src/index.tsx` from it.
- Keep the root `start:cli` script on `bun run --cwd apps/cli start`: it runs the CLI directly so OpenTUI controls the terminal. Bun's `--filter` manages script output, which suits non-interactive or multi-workspace scripts, not a full-screen TUI.

## Commits

- For every commit, consult the `git-commit` skill and choose the message from the actual diff.
- Use Conventional Commit subjects in the format `<type>(<scope>): <imperative description>`. Use a relevant type, omit the scope when there is no useful one, and keep the subject under 72 characters.
- Make the subject specific enough to identify the user-visible or technical change; avoid generic descriptions such as "update feature" or "improve things". Name the affected behavior or capability.
- For every nontrivial commit, include a descriptive body with concise bullets that explain the notable changes in the actual diff (not merely repeat the subject). Choose details from the diff, keep each bullet on its own actual line, and separate the subject and body with a blank line. Never encode line breaks as literal `\\n` text. When using `git commit -m`, pass the body as a multiline shell string or use repeated `-m` options.
- Keep each commit focused on one logical change and stage only the intended files.
